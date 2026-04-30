import express from "express";
import { requireAuth } from "@clerk/express";
import { protectAdmin } from "../middleware/auth.js"; 
import { getAllBookings,getAllShows,getDashboardData,isAdmin } from "../controllers/adminController.js";

const adminRouter= express.Router()



// requireAuth() ensures a valid Clerk token is present before any handler runs
adminRouter.get('/is-admin',  protectAdmin, isAdmin)
adminRouter.get('/dashboard', protectAdmin, getDashboardData)
adminRouter.get('/all-shows',  protectAdmin, getAllShows)
adminRouter.get('/all-bookings',  protectAdmin, getAllBookings)

export default adminRouter