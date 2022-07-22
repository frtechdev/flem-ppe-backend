// WIP - VALIDAR JUNTAMENTE DE SERVIDOR SMTP
export default async function handler(req, res) {
  const { google } = require("googleapis");
  const nodemailer = require("nodemailer");
  const { name, email, message } = req.body;
  const emails = JSON.stringify(email).split(",");

  /**
   * AUTENTICAÇÃO VIA GOOGLE OAUTH2
   */
  // const client_id =
  //   "";
  // const client_secret = "";
  // const redirect_url = "https://developers.google.com/oauthplayground";
  // const refresh_token =
  //   "";

  // const oAuth2Client = new google.auth.OAuth2(
  //   client_id,
  //   client_secret,
  //   redirect_url
  // );
  // oAuth2Client.setCredentials({ refresh_token: refresh_token });

  async function send() {
    try {
      /**
       * AUTENTICAÇÃO VIA GOOGLE OAUTH2
       */
      //   const accessToken = await oAuth2Client.getAccessToken();
      //   const transport = nodemailer.createTransport({
      //     service: "gmail",
      //     auth: {
      //       type: "OAUTH2",
      //       user: "@gmail.com",
      //       clientId: client_id,
      //       clientSecret: client_secret,
      //       refreshToken: refresh_token,
      //       accessToken: accessToken,
      //     },
      //   });

      /**
       * AUTENTICAÇÃO VIA SMTP
       */
      const transport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
auth: { 
   user: '@gmail.com', 
   pass: '' 
 } 
});
      const output = [];
      const messages = [];
          for (let i = 0; i < emails.length; i++){
            const email = emails[i].trim().replace('"', "");
            messages.push({
                  from: {
                    name: "TESTE2",
                    address: "@gmail.com",
                  },
                  to: email,
                  subject: name,
                  text: message,
                  html: `<div>${message}</div>`,
          }) 
          }
            while (messages.length) {
              output.push(await transport.sendMail(messages.shift()));
            }
          transport.close();
          return output;
    } catch (err) {
      console.log(err);
      return err;
    }
  }
  const resp = await send();
  console.log(JSON.stringify(resp));
  return res.status(200).json({ status: "ok", resp });
}
