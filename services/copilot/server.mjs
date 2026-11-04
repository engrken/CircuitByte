import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CopilotClient} from '@github/copilot-sdk';
import {createBridgeServer} from './bridge.mjs';

const secret=process.env.COPILOT_SERVICE_SECRET;

async function complete({token,messages}){
  let client,directory,timer;
  try{
    directory=await mkdtemp(join(tmpdir(),'circuitbyte-copilot-'));
    // Every request gets its own runtime, temporary directory and GitHub identity.
    // Do not expose filesystem, shell, tools, MCP or ambient host credentials.
    client=new CopilotClient({
      mode:'empty',baseDirectory:directory,useLoggedInUser:false,
      logLevel:'none',sessionIdleTimeoutSeconds:120,
      env:{PATH:process.env.PATH,HOME:directory,TMPDIR:directory,
        ...(process.env.COPILOT_CLI_PATH?{COPILOT_CLI_PATH:process.env.COPILOT_CLI_PATH}:{})}
    });
    const generate=async()=>{
      const session=await client.createSession({
        sessionId:randomUUID(),gitHubToken:token,
        model:process.env.COPILOT_MODEL||'gpt-5.4',
        availableTools:[],
        systemMessage:{mode:'append',content:messages[0].content}
      });
      const result=await session.sendAndWait({prompt:messages[1].content},80000);
      return result?.data?.content;
    };
    return await Promise.race([
      generate(),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Copilot deadline exceeded')),85000);})
    ]);
  }finally{
    clearTimeout(timer);
    if(client)await client.forceStop().catch(()=>{});
    if(directory)await rm(directory,{recursive:true,force:true}).catch(()=>{});
  }
}

const server=createBridgeServer({secret,complete});
server.listen(Number(process.env.PORT)||8080,'0.0.0.0');
