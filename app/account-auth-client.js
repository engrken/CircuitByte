'use client';
import {createAuthClient} from 'better-auth/react';
import {emailOTPClient,twoFactorClient} from 'better-auth/client/plugins';

export const auth=createAuthClient({plugins:[emailOTPClient(),twoFactorClient()]});

export async function sendAdminCode(){
 const result=await auth.twoFactor.sendOtp();
 if(result.error)throw Error(result.error.message||'Could not send the verification code.');
}
