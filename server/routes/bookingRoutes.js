import express from 'express'
import { createBooking, getOccupiedSeats,createRazorpayOrder,verifyPayment } from '../controllers/bookingController.js'

const bookingRouter = express.Router()

bookingRouter.post('/create-order', createRazorpayOrder)
bookingRouter.post("/verify-payment", verifyPayment);
bookingRouter.post('/create',createBooking)
bookingRouter.get('/seats/:showId',getOccupiedSeats)

export default bookingRouter;
