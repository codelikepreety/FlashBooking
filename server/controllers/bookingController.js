import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import razorpayInstance from "../configs/razorpay.js";
import crypto from "crypto";

//function to check availablity of selected seats for a movie
const checkSeatsAvailability = async (showId, selectedSeats)=>{
  try{
    const showData= await Show.findById(showId)
    if(!showData) return false;

    const occupiedSeats = showData.occupiedSeats;
    const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat])
    return !isAnySeatTaken
  } catch (error){
    console.log(error.message)
    return false;

  }
}

export const createRazorpayOrder = async (req, res) => {
  try {
    const { showId, selectedSeats } = req.body;

    if (!showId || !selectedSeats || selectedSeats.length === 0) {
      return res.json({
        success: false,
        message: "Show and seats are required"
      });
    }

    // Get show details from database
    const showData = await Show.findById(showId);

    if (!showData) {
      return res.json({
        success: false,
        message: "Show not found"
      });
    }

    // Check whether seats are still available
    const isAvailable = await checkSeatsAvailability(
      showId,
      selectedSeats
    );

    if (!isAvailable) {
      return res.json({
        success: false,
        message: "Selected seats are not available"
      });
    }

    // Calculate amount on the SERVER
    const amount = showData.showPrice * selectedSeats.length;

    // Razorpay amount must be in paise
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `show_${showId}_${Date.now()}`,
      notes: {
        showId: showId,
        seats: selectedSeats.join(",")
      }
    };

    const order = await razorpayInstance.orders.create(options);

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error("Razorpay order error:", error);

    res.json({
      success: false,
      message: error.message
    });
  }
};

export const createBooking = async(req,res)=>{
  try{
    const {userId}= req.auth
    const {showId,selectedSeats}=req.body
    const {origin} = req.headers

    //check if the seats is available for the selected show
    const isAvailable = await checkSeatsAvailability(showId,selectedSeats)

    if(!isAvailable){
      return res.json({success:false,message:"selected seats are not available"})
 
    }
    //get the show deatils
    const showData = await Show.findById(showId).populate('movie')

    //create a new booking
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice*selectedSeats.length,
      bookedSeats: selectedSeats,
      isPaid:true,

    })
    selectedSeats.map((seats)=>{
      showData.occupiedSeats[seats]=userId
    })
    showData.markModified('occupiedSeats')

    await showData.save()

    //stripe gateway initialized

    res.json({success:true,message:'booked successfully'})

  }catch (error){
    console.log(error.message);
    res.json({success:false,message:error.message})

  }
}

export const getOccupiedSeats = async (req,res)=>{
  try {
    const {showId}= req.params;
    const showData = await Show.findById(showId)

    const occupiedSeats= Object.keys(showData.occupiedSeats)

    res.json({success:true, occupiedSeats})
  }catch (error){
    console.log(error.message)
    res.json({success:false,message:error.message})
  }
}

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      showId,
      selectedSeats,
    } = req.body;

    const { userId } = req.auth;

    // Basic validation
    if (
      !userId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !showId ||
      !selectedSeats ||
      selectedSeats.length === 0
    ) {
      return res.json({
        success: false,
        message:
          "Required payment or booking details are missing",
      });
    }

    // ------------------------------------------------
    // 1. Get show
    // ------------------------------------------------

    const showData = await Show.findById(showId);

    if (!showData) {
      return res.json({
        success: false,
        message: "Show not found",
      });
    }

    // ------------------------------------------------
    // 2. Verify Razorpay signature
    // ------------------------------------------------

    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        razorpay_order_id +
          "|" +
          razorpay_payment_id
      )
      .digest("hex");

    if (
      generatedSignature !== razorpay_signature
    ) {
      return res.json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const razorpayOrder =
      await razorpayInstance.orders.fetch(
        razorpay_order_id
      );

    // ------------------------------------------------
    // 3. Verify Razorpay order amount
    // ------------------------------------------------

    const expectedAmount =
      showData.showPrice *
      selectedSeats.length *
      100;

    if (
      razorpayOrder.amount !== expectedAmount ||
      razorpayOrder.currency !== "INR"
    ) {
      return res.json({
        success: false,
        message: "Payment amount mismatch",
      });
    }

    // ------------------------------------------------
    // 4. Check seats again
    // ------------------------------------------------

    const isAvailable =
      await checkSeatsAvailability(
        showId,
        selectedSeats
      );

    if (!isAvailable) {
      return res.json({
        success: false,
        message:
          "Selected seats are no longer available",
      });
    }

    // ------------------------------------------------
    // 5. Create booking
    // ------------------------------------------------

    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount:
        showData.showPrice *
        selectedSeats.length,
      bookedSeats: selectedSeats,
    });

    // ------------------------------------------------
    // 6. Mark seats as occupied
    // ------------------------------------------------

    selectedSeats.forEach((seat) => {
      showData.occupiedSeats[seat] = userId;
    });

    showData.markModified("occupiedSeats");

    await showData.save();

    // ------------------------------------------------
    // 7. Send success response
    // ------------------------------------------------

    res.json({
      success: true,
      message:
        "Payment verified and booking confirmed",
      booking,
    });

  } catch (error) {
    console.error(
      "Payment verification error:",
      error.message
    );

    res.json({
      success: false,
      message: error.message,
    });
  }
};
