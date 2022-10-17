
const { FlexConversationService } = require(Runtime.getAssets()[
    '/conv-util.js'
  ].path);
  
  exports.handler = async function (context, event, callback) {
    
      const client = context.getTwilioClient();
     const flexConversationService = new FlexConversationService(client);
      // setup a response object
      const response = new Twilio.Response();
      response.appendHeader('Access-Control-Allow-Origin', '*');
      response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
      response.appendHeader('Content-Type', 'application/json');  
    
      
  
    
      try{
        const resp = await flexConversationService.refreshToken(event.token);
      response.setBody(resp);
      }catch(e){
        console.error(e);
        response.setStatusCode(403);
        response.setBody({"message":"notok"})
      }
    
      callback(null, response);
    };
    