import pg from 'pg';
import {betterAuth} from 'better-auth';
import {getMigrations} from 'better-auth/db/migration';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const options={database:pool,secret:process.env.BETTER_AUTH_SECRET,baseURL:process.env.BETTER_AUTH_URL,emailAndPassword:{enabled:true,minPasswordLength:12},rateLimit:{enabled:true,storage:'database'}};
try{const {runMigrations}=await getMigrations(options);await runMigrations();if(!process.env.ADMIN_EMAIL||!process.env.INITIAL_ADMIN_PASSWORD||process.env.INITIAL_ADMIN_PASSWORD.length<12)throw Error('Provide ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (12+ characters) locally. Never commit them.');await betterAuth(options).api.signUpEmail({body:{email:process.env.ADMIN_EMAIL,password:process.env.INITIAL_ADMIN_PASSWORD,name:'CircuitByte Admin'}});console.log('Administrator created. Remove INITIAL_ADMIN_PASSWORD from local environment.');}finally{await pool.end();}
