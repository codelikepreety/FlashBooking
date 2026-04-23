import { clerkClient } from "@clerk/express";

export const protectAdmin = async (req,res,next)=>{
  try {
    const { userId } =req,auth();
    const user = await clearkClient.users.getUser(userId)
    if(user.priavteMetadata.role ! == 'admin'){
      return res.json({success:false,message:"not authorised"})
    }
    next()
    
  }catch (error){
    return res.json({sucess:false , message:"not authorised"})
  }

}