import { getAuth } from '@clerk/express';
import { clerkClient } from '@clerk/express';

export const protectAdmin = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.json({ success: false, message: "not authorised" });
    }

    const user = await clerkClient.users.getUser(userId);
    //console.log("User ID:", userId, "Private Metadata:", user.privateMetadata);

    const role = user.privateMetadata?.role?.toLowerCase();

    if (role !== 'admin') {
      return res.json({ success: false, message: "not authorised" });
    }

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.json({ success: false, message: "not authorised" });
  }
};