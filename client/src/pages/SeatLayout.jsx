import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import isoTimeFormat from "../lib/isoTimeFormat";
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";
import { assets } from "../assets/assets";

const SeatLayout = () => {
  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];

  const { id, date } = useParams();

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [show, setShow] = useState(null);

  const navigate = useNavigate();

  const { axios, getToken, user } = useAppContext();

  // Get show details
  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);

      if (data.success) {
        setShow(data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Select / unselect seat
  const handleSeatClick = (seatId) => {
    if (!selectedTime) {
      return toast("Please select a time first");
    }

    if (
      !selectedSeats.includes(seatId) &&
      selectedSeats.length >= 4
    ) {
      return toast("You can select maximum of 4 seats");
    }

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    );
  };

  // Render seats
  const renderSeats = (row, count = 9) => {
    return (
      <div key={row} className="flex gap-2 mt-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: count }, (_, i) => {
            const seatId = `${row}${i + 1}`;

            return (
              <button
                key={seatId}
                onClick={() => handleSeatClick(seatId)}
                disabled={occupiedSeats.includes(seatId)}
                className={`h-8 w-8 rounded border border-primary/60 ${
                  selectedSeats.includes(seatId)
                    ? "bg-primary text-white"
                    : ""
                } ${
                  occupiedSeats.includes(seatId)
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {seatId}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Get already occupied seats
  const getOccupiedSeats = async () => {
    try {
      const { data } = await axios.get(
        `/api/booking/seats/${selectedTime.showId}`
      );

      if (data.success) {
        setOccupiedSeats(data.occupiedSeats);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Load Razorpay checkout script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Don't load it again if already loaded
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");

      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => {
        resolve(true);
      };

      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  // Book tickets
  const bookTickets = async () => {
    try {
      // User must be logged in
      if (!user) {
        return toast.error("Please login to proceed");
      }

      // Time and seats must be selected
      if (!selectedTime || !selectedSeats.length) {
        return toast.error("Please select a time and seats");
      }

      // Load Razorpay
      const isScriptLoaded = await loadRazorpayScript();

      if (!isScriptLoaded) {
        return toast.error("Razorpay failed to load");
      }

      // Get authentication token
      const token = await getToken();

      // Create Razorpay order
      const { data } = await axios.post(
        "/api/booking/create-order",
        {
          showId: selectedTime.showId,
          selectedSeats,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!data.success) {
        return toast.error(data.message);
      }

      const order = data.order;

      // Razorpay Checkout options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,

        amount: order.amount,

        currency: order.currency,

        name: "FlashBooking",

        description: "Movie Ticket Booking",

        order_id: order.id,

        // This runs after successful payment
        handler: async function (response) {
          try {
            console.log("Razorpay response:", response);

            const token = await getToken();

            // Send payment information + booking information
            // to our backend for verification
            const { data } = await axios.post(
              "/api/booking/verify-payment",
              {
                razorpay_order_id:
                  response.razorpay_order_id,

                razorpay_payment_id:
                  response.razorpay_payment_id,

                razorpay_signature:
                  response.razorpay_signature,

                showId: selectedTime.showId,

                selectedSeats,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (data.success) {
              toast.success(data.message);

              // Go to bookings after successful
              // payment verification + booking creation
              navigate("/my-bookings");
            } else {
              toast.error(data.message);
            }
          } catch (error) {
            console.error(
              "Payment verification error:",
              error
            );

            toast.error(
              error.response?.data?.message ||
                error.message
            );
          }
        },

        // User information shown in Razorpay
        prefill: {
          name: user.fullName || "",
          email:
            user.primaryEmailAddress?.emailAddress || "",
        },

        theme: {
          color: "#F84464",
        },
      };

      // Open Razorpay Checkout
      const razorpay = new window.Razorpay(options);

      razorpay.open();

    } catch (error) {
      console.error("Booking error:", error);

      toast.error(
        error.response?.data?.message ||
          error.message
      );
    }
  };

  // Get show when page loads
  useEffect(() => {
    getShow();
  }, []);

  // Get occupied seats whenever time changes
  useEffect(() => {
    if (selectedTime) {
      // Clear previously selected seats
      setSelectedSeats([]);

      getOccupiedSeats();
    }
  }, [selectedTime]);

  return show ? (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50">

      {/* Available timings */}
      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30">

        <p className="text-lg font-semibold px-6">
          Available Timings
        </p>

        <div className="mt-5 space-y-1">
          {show?.dateTime?.[date]?.map((item) => (
            <div
              key={item.time}
              onClick={() => setSelectedTime(item)}
              className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${
                selectedTime?.time === item.time
                  ? "bg-primary text-white"
                  : "hover:bg-primary/20"
              }`}
            >
              <ClockIcon className="w-4 h-4" />

              <p className="text-sm">
                {isoTimeFormat(item.time)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Seat layout */}
      <div className="relative flex-1 flex flex-col items-center max-md:mt-16">

        <BlurCircle
          top="-100px"
          left="-100px"
        />

        <BlurCircle
          bottom="0"
          right="0"
        />

        <h1 className="text-2xl font-semibold mb-4">
          Select Your Seats
        </h1>

        <img
          src={assets.screenImage}
          alt="screen"
          className="w-full max-w-lg"
        />

        <p className="text-gray-400 text-sm mb-6">
          SCREEN SIDE
        </p>

        <div className="flex flex-col items-center mt-10 text-xs text-gray-300">

          <div className="flex flex-col items-center mt-10 text-xs text-gray-300">
            {groupRows[0].map((row) =>
              renderSeats(row)
            )}
          </div>

          <div className="grid grid-cols-2 gap-11">
            {groupRows.slice(1).map((group, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center mt-10 text-xs text-gray-300"
              >
                {group.map((row) =>
                  renderSeats(row)
                )}
              </div>
            ))}
          </div>

        </div>

        <button
          onClick={bookTickets}
          className="flex items-center gap-1 mt-20 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
        >
          Proceed to Checkout

          <ArrowRightIcon
            strokeWidth={3}
            className="w-4 h-4"
          />
        </button>

      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;