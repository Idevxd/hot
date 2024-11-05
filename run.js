import { KeyPair, keyStores, connect, Near } from "near-api-js";
import BigNumber from "bignumber.js";
import { mainnetConfig } from "./rpc.js";
import { acc } from "./account.js";
import figlet from 'figlet';
import readline from 'readline';


console.clear();


const displayName = (name) => {
  figlet(name, { font: 'Slant' }, (err, data) => {
    if (err) {
      console.log('Something went wrong...');
      console.dir(err);
      return;
    }
    console.log("\x1b[36m" + data + "\x1b[0m");
  });
};

displayName("BACTIAR291");


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


const ACCESS_KEY = '111000'; 


rl.question('Masukkan kunci akses: ', async (inputKey) => {
  if (inputKey === ACCESS_KEY) {
    console.log("Kunci akses benar. Melanjutkan...");
    
    const near = new Near(mainnetConfig);

    const getAccount = (accountId, privateKey) =>
      new Promise(async (resolve, reject) => {
        try {
          const keyStore = new keyStores.InMemoryKeyStore();
          const keyPair = KeyPair.fromString(privateKey);
          await keyStore.setKey(mainnetConfig.networkId, accountId, keyPair);

          const connectionConfig = {
            deps: {
              keyStore,
            },
            ...mainnetConfig,
          };

          const accountConnection = await connect(connectionConfig);
          const account = await accountConnection.account(accountId);

          resolve(account);
        } catch (error) {
          reject(error);
        }
      });

    const getUser = async (near, accountId) => {
      const argument = {
        account_id: accountId,
      };

      const result = await near.connection.provider.query({
        account_id: "game.hot.tg",
        finality: "optimistic",
        request_type: "call_function",
        method_name: "get_user",
        args_base64: Buffer.from(JSON.stringify(argument)).toString("base64"),
      });

      const detailUser = JSON.parse(Buffer.from(result.result).toString());

      return detailUser;
    };

    const getNearBalance = async (accountId, privateKey) => {
      const account = await getAccount(accountId, privateKey);
      const Nearbalance = await account.getAccountBalance();
      return new BigNumber(Nearbalance.total).dividedBy(1e24);
    };

    const processAccount = async (accountId, privateKey, delayInHours) => {
      while (true) {
        try {
          const mineAndUpdate = async () => {
            const NearBalanceUser = await getNearBalance(accountId, privateKey);

            console.log(`
\x1b[34mAccount ID:\x1b[0m ${accountId}
\x1b[34mNear Balance:\x1b[0m ${NearBalanceUser}
\x1b[34mStatus:\x1b[0m Claiming...
            `);

            let transactionHash = null;
            while (transactionHash == null) {
              try {
                const account = await getAccount(accountId, privateKey);
                const callContract = await account.functionCall({
                  contractId: "game.hot.tg",
                  methodName: "claim",
                  args: {},
                });

                transactionHash = callContract.transaction.hash;

                console.log(`
\x1b[32mAccount ID:\x1b[0m ${accountId}
\x1b[32mNear Balance:\x1b[0m ${NearBalanceUser}
\x1b[32mStatus:\x1b[0m \x1b[33mClaimed\x1b[0m \x1b[35m${callContract.transaction.hash}\x1b[0m...
                `);
                await new Promise((resolve) => setTimeout(resolve, 5000));
              } catch (contractError) {
                console.log(`
\x1b[31mAccount ID:\x1b[0m ${accountId}
\x1b[31mNear Balance:\x1b[0m ${NearBalanceUser}
\x1b[31mStatus:\x1b[0m \x1b[31m${contractError.message}\x1b[0m...
                `);
                await new Promise((resolve) => setTimeout(resolve, 5000));
              }
            }
            
            console.log(`
\x1b[36mAccount ID:\x1b[0m ${accountId}
\x1b[36mNear Balance:\x1b[0m ${NearBalanceUser}
\x1b[36mStatus:\x1b[0m Mining for ${delayInHours} Hours 5 Minutes...
            `);
            
            await new Promise((resolve) =>
              setTimeout(resolve, delayInHours * 3600 * 1000 + 5 * 60 * 1000)
            );
          };

          await mineAndUpdate();
        } catch (error) {
          console.log(`
\x1b[31mAccount ID:\x1b[0m ${accountId}
\x1b[31mStatus:\x1b[0m ${error.message} - ${error.cause ?? ""}...
          `);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    };

    (async () => {
      const allPromise = [];
      const promises = acc.map(async (account) => {
        const [accountId, privateKey, delayInHours] = account.split("|");
        processAccount(accountId, privateKey, delayInHours);
      });

      for (const processAccount of promises) {
        allPromise.push(await processAccount);
      }
    })();

  } else {
    console.log("Kunci akses salah. Skrip tidak akan dijalankan.");
    rl.close();
  }
});
