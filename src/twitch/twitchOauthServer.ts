// Heavily based on: https://github.com/iSlammedMyKindle/kindle-twitch-oauth/blob/master/index.ts
// Thanks a lot! :)
import { readFileSync } from "fs";
import { promises as fs } from "fs";
import {
  createServer,
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from "http";
import https, { request } from "https";
import open from "open";
import { HttpsConfig, TwitchConfig } from "../types.js";
import { TOKEN_DATA_PATH } from "../index.js";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string[];
}

const snakeToCamel = (str: string): string => {
  return str.replace(/([-_]\w)/g, (g) => g[1].toUpperCase());
};

const objectKeysToCamel = (obj: Record<string, any>): Record<string, any> => {
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    newObj[snakeToCamel(key)] = obj[key];
  }
  return newObj;
};

const createRequestListener = (
  url: string,
  resolve: (params: URLSearchParams) => void
): RequestListener => {
  const page = "<h1>Auth was successful! :)</h1>";

  return (req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.write(page);
    res.end();
    resolve(new URL(req.url!, url).searchParams);
  };
};

const createTempServer = (
  server: RequestListener,
  httpsParams?: HttpsConfig
) => {
  return httpsParams?.useHttps
    ? https.createServer(
        {
          key: readFileSync(httpsParams.keyPath as string),
          cert: readFileSync(httpsParams.certPath as string),
          passphrase: httpsParams.passphrase as string,
        },
        server
      )
    : createServer(server);
};

const startWebServer = (
  url: string,
  httpsParams?: HttpsConfig
): Promise<URLSearchParams> => {
  return new Promise((resolve, reject) => {
    const server = createRequestListener(url, resolve);
    const tempServer = createTempServer(server, httpsParams);

    tempServer.listen(3000);
    tempServer.on("error", (error: string) => reject(error));
  });
};

const createAuthUrl = (twitchParams: TwitchConfig): URL => {
  const authUrl = new URL("https://id.twitch.tv/oauth2/authorize");
  authUrl.searchParams.append("client_id", twitchParams.clientId);
  authUrl.searchParams.append("redirect_uri", twitchParams.redirectUri);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", twitchParams.scopes);
  return authUrl;
};

const openAuthUrl = async (authUrl: URL): Promise<void> => {
  console.log(
    "Trying to open Twitch authentication link in a browser...\n" +
      authUrl.toString()
  );
  try {
    await open(authUrl.toString());
  } catch (error) {
    console.error(
      "Failed to open browser, please open the following link manually:\n" +
        authUrl.toString()
    );
  }
};

const makeOAuthRequest = (
  twitchParams: TwitchConfig,
  code: string
): Promise<AuthResponse> => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      client_id: twitchParams.clientId,
      client_secret: twitchParams.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: twitchParams.redirectUri,
    });

    const requestOptions = {
      hostname: "id.twitch.tv",
      path: "/oauth2/token",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": postData.length,
      },
    };

    const oauthReq = request(requestOptions, (res: IncomingMessage) => {
      const resBuffer: Buffer[] = [];

      res.on("data", (chunk: Buffer) => {
        resBuffer.push(chunk);
      });

      res.on("end", () => {
        try {
          const responseData = JSON.parse(Buffer.concat(resBuffer).toString());
          // Write the token data to a file
          writeTokenData(responseData);
          resolve(objectKeysToCamel(responseData) as AuthResponse);
        } catch (error) {
          reject(
            new Error("Failed to parse JSON response from Twitch: " + error)
          );
        }
      });
    });

    oauthReq.on("error", (error: string) => {
      reject(new Error("Failed to make request to Twitch: " + error));
    });

    oauthReq.write(postData);
    oauthReq.end();
  });
};

export const authenticateTwitch = async (
  twitchParams: TwitchConfig,
  httpsParams: HttpsConfig
): Promise<AuthResponse> => {
  const authUrl = createAuthUrl(twitchParams);
  await openAuthUrl(authUrl);
  const oauthParams = await startWebServer(
    twitchParams.redirectUri,
    httpsParams
  );
  const code = oauthParams.get("code");

  if (!code) {
    throw new Error(
      "Authorization code not found in URL parameters. Stopping application :("
    );
  }

  return makeOAuthRequest(twitchParams, code);
};

const writeTokenData = async (tokenData: AuthResponse): Promise<void> => {
  try {
    // Convert the token data to camel case
    const camelCasedTokenData = objectKeysToCamel(tokenData);
    await fs.writeFile(
      TOKEN_DATA_PATH,
      JSON.stringify(camelCasedTokenData, null, 4),
      "utf-8"
    );
  } catch (error) {
    console.error(`Failed to write token data to file: ${error}`);
    throw error;
  }
};
