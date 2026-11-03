// Return only known classifications. Never forward provider bodies, prompts or
// authentication details to visitors or logs.
export async function diagramProviderFailure(response){
 let body;try{body=await response.json();}catch{}
 const kind=body?.error?.code||body?.error?.type||body?.code;
 const known=new Set(['customer_verification_required','insufficient_funds','quota_for_entity_exceeded','model_not_found','invalid_api_key','permission_denied']);
 // Match known meanings, then discard the text. Error messages can contain
 // account details, so neither logs nor client responses include their contents.
 const message=String(body?.error?.message||body?.message||(typeof body?.error==='string'?body.error:'')).slice(0,8000).toLowerCase();
 const tierRestricted=response.status===403&&/free[ -]?tier|free credits|paid tier|purchase.*credits|purchased credits/.test(message);
 const regionRestricted=response.status===403&&/region|location|country|geograph/.test(message);
 const providerCode=tierRestricted?'free_tier_model_restricted':regionRestricted?'provider_region_restricted':known.has(kind)?kind:'unclassified';
 const code=tierRestricted?'IMAGE_MODEL_TIER_RESTRICTED':response.status===403?'IMAGE_ACCESS_DENIED':response.status===401?'IMAGE_AUTH_FAILED':response.status===402?'IMAGE_BUDGET_UNAVAILABLE':response.status===429?'IMAGE_RATE_LIMITED':'IMAGE_PROVIDER_UNAVAILABLE';
 const reason=tierRestricted?'This image model is not available on the site’s current AI Gateway tier. The site administrator must configure an eligible image model or enable the required Gateway access.':regionRestricted?'The image provider rejected this request because of its regional availability rules.':providerCode==='customer_verification_required'?'The site’s AI Gateway account requires verification.':response.status===403?'The image provider denied access (403). The site administrator must check AI Gateway model permissions and account access.':response.status===401?'The site’s image service could not authenticate.':response.status===402?'The site’s image service budget or balance is unavailable.':response.status===429?'The image service is temporarily rate limited.':'The image provider could not complete this request.';
 return {code,providerCode,status:response.status,error:reason+' No AI credit was deducted; no automatic retry was made.'};
}
