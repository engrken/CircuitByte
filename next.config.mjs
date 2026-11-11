const privatePageHeaders=[
 {key:'Referrer-Policy',value:'no-referrer'},
 {key:'X-Robots-Tag',value:'noindex, nofollow'}
];
export default {
 outputFileTracingIncludes:{'/api/orders/my/qr':['./assets/circuitbyte-qrph.jpg']},
 async rewrites(){return [{source:'/catalog',destination:'/catalog.html'}];},
 async headers(){
  return [
   {source:'/(.*)',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'X-Frame-Options',value:'DENY'}
   ]},
   ...['/admin/:path*','/dashboard','/track.html'].map(source=>({source,headers:privatePageHeaders}))
  ];
 }
};
