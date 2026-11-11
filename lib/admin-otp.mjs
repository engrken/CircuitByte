import {twoFactor} from 'better-auth/plugins';

export const adminOtpSendPath='/two-factor/send-otp';
export const adminOtpVerifyPath='/two-factor/verify-otp';

export const adminOtpSession={
 additionalFields:{
  adminOtpVerified:{type:'boolean',required:false,defaultValue:false,input:false}
 }
};

export function adminOtpPlugin(sendOTP){
 return twoFactor({
  totpOptions:{disable:true},
  twoFactorCookieMaxAge:600,
  otpOptions:{sendOTP,digits:6,period:5,allowedAttempts:3,storeOTP:'encrypted'}
 });
}

export async function requireAdminOtpEnrollment(pool,email){
 if(!email?.trim())return;
 await pool.query(`WITH administrator AS (
  UPDATE "user" SET "twoFactorEnabled"=true
  WHERE lower(email)=$1 AND "twoFactorEnabled" IS DISTINCT FROM true
  RETURNING id
 )
 DELETE FROM "session"
 WHERE "userId" IN (SELECT id FROM administrator)
 AND "adminOtpVerified" IS DISTINCT FROM true`,[email.trim().toLowerCase()]);
}

export function adminOtpSchema(database){
 return {
  database,emailAndPassword:{enabled:true},
  session:adminOtpSession,plugins:[adminOtpPlugin()],
  rateLimit:{enabled:true,storage:'database'}
 };
}
