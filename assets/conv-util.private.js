const axios = require("axios");
const Twilio = require("twilio");
const jwt = require("jsonwebtoken");

class FlexConversationService {
  constructor(twilioClient) {
    this.twilioClient = twilioClient;
    
  }

    async contactWebchatOrchestrator(formData, customerFriendlyName){
    const params = new URLSearchParams();
    params.append("AddressSid", process.env.ADDRESS_SID);
    params.append("ChatFriendlyName", "Webchat widget");
    params.append("CustomerFriendlyName", customerFriendlyName);
    params.append(
        "PreEngagementData",
        JSON.stringify({
            ...formData,
            friendlyName: customerFriendlyName
        })
    );

    let conversationSid;
    let identity;

    try {
        const res = await axios.post(`https://flex-api.twilio.com/v2/WebChats`, params, {
            auth: {
                username: process.env.ACCOUNT_SID,
                password: process.env.AUTH_TOKEN
            }
        });
        ({ identity, conversation_sid: conversationSid } = res.data);
    } catch (e) {        
        throw e.response.data;
    }

    

    return {
        conversationSid,
        identity
    };
}

async sendUserMessage(conversationSid, identity, messageBody) {    

    return this.twilioClient.conversations.v1
    .conversations(conversationSid)
        .messages.create({
            body: messageBody,
            author: identity,
            xTwilioWebhookEnabled: true // trigger webhook
        })
}

 async  sendWelcomeMessage(conversationSid, customerFriendlyName) {    

    return this.twilioClient
    .conversations.v1
    .conversations(conversationSid)
        .messages.create({
            body: `Welcome ${customerFriendlyName}! An agent will be with you in just a moment.`,
            author: "Concierge"
        })       
}


async createToken(identity){
    
    const { AccessToken } = Twilio.jwt;
    const { ChatGrant } = AccessToken;

    const chatGrant = new ChatGrant({
        serviceSid: process.env.CONVERSATIONS_SERVICE_SID
    });

    const token = new AccessToken(process.env.ACCOUNT_SID, process.env.API_KEY, process.env.API_SECRET, {
        identity,
        ttl: parseInt(process.env.TOKEN_TTL_IN_SECONDS)
    });
    token.addGrant(chatGrant);
    const jwt = token.toJwt();
    
    return jwt;
};

async refreshToken(token){
    let providedIdentity;

    
        const validatedToken = await new Promise((res, rej) =>
            jwt.verify(token, process.env.API_SECRET, {}, (err, decoded) => {
                if (err) return rej(err);
                return res(decoded);
            })
        );
        providedIdentity = validatedToken?.grants?.identity;
    
    const refreshedToken = await this.createToken(providedIdentity);

    response.send({
        token: refreshedToken,
        expiration: Date.now() + (parseInt(process.env.TOKEN_TTL_IN_SECONDS) * 1000)
    });
}


async  initWebchatController (formData){
    
    

    const customerFriendlyName = formData?.friendlyName || "Customer";

    let conversationSid;
    let identity;

    // Hit Webchat Orchestration endpoint to generate conversation and get customer participant sid
   
        const result = await this.contactWebchatOrchestrator(formData, customerFriendlyName);
        ({ identity, conversationSid } = result);
   

    // Generate token for customer
    const token = await this.createToken(identity);

    // OPTIONAL — if user query is defined
    if (formData.query!=null) {
        // use it to send a message in behalf of the user with the query as body
       await this.sendUserMessage(conversationSid, identity, formData.query)
       await this.sendWelcomeMessage(conversationSid, customerFriendlyName)
    }

   return{
        token,
        conversationSid,
        expiration: Date.now() + (parseInt(process.env.TOKEN_TTL_IN_SECONDS) * 1000)
    };

    
}


  
}

module.exports = {
    FlexConversationService
};
