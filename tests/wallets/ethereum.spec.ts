import BN from "bn.js";
import { privateToAddress } from "ethereumjs-util";
import Web3 from "web3";
import Asset from "../../src/asset";
import Ledger from "../../src/ledger";
import { Web3EthereumWallet } from "../../src/wallets/ethereum";
import parityTestContainer from "../containers/parityTestContainer";
import containerTest from "../containerTest";
import Erc20ABI from "../Erc20ABI.json";
import EthereumHarness from "../ethereumHarness";
import GreeterABI from "../GreeterABI.json";
import sleep from "../sleep";

async function fundAddressOfPrivateKey(web3: Web3, privateKey: Buffer) {
  const initialFunding = new BN(web3.utils.toWei("10", "ether"));
  const address = "0x" + privateToAddress(privateKey).toString("hex");

  const ethereumHarness = new EthereumHarness(web3);
  await ethereumHarness.fund(address, initialFunding);

  // sanity check that we actually funded
  expect(await web3.eth.getBalance(address)).toEqual(
    initialFunding.toString(10)
  );

  return initialFunding;
}

const privateKey = Buffer.from(
  "1759af2005454dfc596d8e0d09469f5997069e8e6b24a82defa0dae4a387e5f7",
  "hex"
);
const greeterContractCode = Buffer.from(
  "608060405234801561001057600080fd5b5061020c806100206000396000f3fe60806040526004361061003b576000357c010000000000000000000000000000000000000000000000000000000090048063ead710c414610040575b600080fd5b34801561004c57600080fd5b506101066004803603602081101561006357600080fd5b810190808035906020019064010000000081111561008057600080fd5b82018360208201111561009257600080fd5b803590602001918460018302840111640100000000831117156100b457600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f820116905080830192505050505050509192919290505050610108565b005b7f8252da6cc8ba70656d63b4439295f2de59ffee7cf90c96f5aee10857159474e781604051808060200180602001838103835260058152602001807f48656c6c6f000000000000000000000000000000000000000000000000000000815250602001838103825284818151815260200191508051906020019080838360005b838110156101a2578082015181840152602081019050610187565b50505050905090810190601f1680156101cf5780820380516001836020036101000a031916815260200191505b50935050505060405180910390a15056fea165627a7a72305820a7fc90d894eccd0e714c28a89f2dff015f9e03a78a8dcca74ed34bef840c23690029",
  "hex"
);

const tokenContractCode = Buffer.from(
  "60806040526000600760006101000a81548160ff0219169083151502179055503480156200002c57600080fd5b506040805190810160405280600b81526020017f50726f666974546f6b656e0000000000000000000000000000000000000000008152506040805190810160405280600381526020017f505254000000000000000000000000000000000000000000000000000000000081525060128260039080519060200190620000b3929190620001b0565b508160049080519060200190620000cc929190620001b0565b5080600560006101000a81548160ff021916908360ff1602179055505050506200010f336006620001156401000000000262001779179091906401000000009004565b6200025f565b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16141515156200015257600080fd5b60018260000160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083151502179055505050565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10620001f357805160ff191683800117855562000224565b8280016001018555821562000224579182015b828111156200022357825182559160200191906001019062000206565b5b50905062000233919062000237565b5090565b6200025c91905b80821115620002585760008160009055506001016200023e565b5090565b90565b61196d806200026f6000396000f3006080604052600436106100f1576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806305d2035b146100f657806306fdde0314610125578063095ea7b3146101b557806318160ddd1461021a57806323b872dd14610245578063313ce567146102ca57806339509351146102fb57806340c10f191461036057806370a08231146103c55780637d64bcb41461041c57806395d89b411461044b578063983b2d56146104db578063986502751461051e578063a457c2d714610535578063a9059cbb1461059a578063aa271e1a146105ff578063dd62ed3e1461065a575b600080fd5b34801561010257600080fd5b5061010b6106d1565b604051808215151515815260200191505060405180910390f35b34801561013157600080fd5b5061013a6106e8565b6040518080602001828103825283818151815260200191508051906020019080838360005b8381101561017a57808201518184015260208101905061015f565b50505050905090810190601f1680156101a75780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b3480156101c157600080fd5b50610200600480360381019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919050505061078a565b604051808215151515815260200191505060405180910390f35b34801561022657600080fd5b5061022f6108b7565b6040518082815260200191505060405180910390f35b34801561025157600080fd5b506102b0600480360381019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291905050506108c1565b604051808215151515815260200191505060405180910390f35b3480156102d657600080fd5b506102df610c7c565b604051808260ff1660ff16815260200191505060405180910390f35b34801561030757600080fd5b50610346600480360381019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610c93565b604051808215151515815260200191505060405180910390f35b34801561036c57600080fd5b506103ab600480360381019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610eca565b604051808215151515815260200191505060405180910390f35b3480156103d157600080fd5b50610406600480360381019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050610f10565b6040518082815260200191505060405180910390f35b34801561042857600080fd5b50610431610f58565b604051808215151515815260200191505060405180910390f35b34801561045757600080fd5b50610460610fd8565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156104a0578082015181840152602081019050610485565b50505050905090810190601f1680156104cd5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b3480156104e757600080fd5b5061051c600480360381019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919050505061107a565b005b34801561052a57600080fd5b506105336110e8565b005b34801561054157600080fd5b50610580600480360381019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291905050506110fe565b604051808215151515815260200191505060405180910390f35b3480156105a657600080fd5b506105e5600480360381019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050611335565b604051808215151515815260200191505060405180910390f35b34801561060b57600080fd5b50610640600480360381019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050611555565b604051808215151515815260200191505060405180910390f35b34801561066657600080fd5b506106bb600480360381019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050611572565b6040518082815260200191505060405180910390f35b6000600760009054906101000a900460ff16905090565b606060038054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156107805780601f1061075557610100808354040283529160200191610780565b820191906000526020600020905b81548152906001019060200180831161076357829003601f168201915b5050505050905090565b60008073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16141515156107c757600080fd5b81600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040518082815260200191505060405180910390a36001905092915050565b6000600254905090565b60008060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054821115151561091057600080fd5b600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054821115151561099b57600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16141515156109d757600080fd5b610a28826000808773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546115f990919063ffffffff16565b6000808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550610abb826000808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205461161a90919063ffffffff16565b6000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550610b8c82600160008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546115f990919063ffffffff16565b600160008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040518082815260200191505060405180910390a3600190509392505050565b6000600560009054906101000a900460ff16905090565b60008073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1614151515610cd057600080fd5b610d5f82600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205461161a90919063ffffffff16565b600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546040518082815260200191505060405180910390a36001905092915050565b6000610ed533611555565b1515610ee057600080fd5b600760009054906101000a900460ff16151515610efc57600080fd5b610f06838361163b565b6001905092915050565b60008060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b6000610f6333611555565b1515610f6e57600080fd5b600760009054906101000a900460ff16151515610f8a57600080fd5b6001600760006101000a81548160ff0219169083151502179055507fb828d9b5c78095deeeeff2eca2e5d4fe046ce3feb4c99702624a3fd384ad2dbc60405160405180910390a16001905090565b606060048054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156110705780601f1061104557610100808354040283529160200191611070565b820191906000526020600020905b81548152906001019060200180831161105357829003601f168201915b5050505050905090565b61108333611555565b151561108e57600080fd5b6110a281600661177990919063ffffffff16565b8073ffffffffffffffffffffffffffffffffffffffff167f6ae172837ea30b801fbfcdd4108aa1d5bf8ff775444fd70256b44e6bf3dfc3f660405160405180910390a250565b6110fc33600661181390919063ffffffff16565b565b60008073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff161415151561113b57600080fd5b6111ca82600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546115f990919063ffffffff16565b600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546040518082815260200191505060405180910390a36001905092915050565b60008060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054821115151561138457600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16141515156113c057600080fd5b611411826000803373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546115f990919063ffffffff16565b6000803373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055506114a4826000808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205461161a90919063ffffffff16565b6000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040518082815260200191505060405180910390a36001905092915050565b600061156b8260066118ad90919063ffffffff16565b9050919050565b6000600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905092915050565b60008083831115151561160b57600080fd5b82840390508091505092915050565b600080828401905083811015151561163157600080fd5b8091505092915050565b60008273ffffffffffffffffffffffffffffffffffffffff161415151561166157600080fd5b6116768160025461161a90919063ffffffff16565b6002819055506116cd816000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205461161a90919063ffffffff16565b6000808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040518082815260200191505060405180910390a35050565b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16141515156117b557600080fd5b60018260000160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083151502179055505050565b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff161415151561184f57600080fd5b60008260000160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083151502179055505050565b60008073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16141515156118ea57600080fd5b8260000160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff169050929150505600a165627a7a72305820cc38c3be3baa4284d7d1551695c68e8cc7c3d0dfbd17d5fe2d47c1dbe9b52b320029",
  "hex"
);

describe("Ethereum Wallet", () => {
  test(
    "given initial funding, should transfer half of it with locally signed transaction",
    containerTest(parityTestContainer, async ({ container }) => {
      const targetAddress = "0xcb777414c38e426c7038a7c4908751f5e864f7ad";

      const web3 = new Web3(
        new Web3.providers.HttpProvider(
          `http://localhost:${container.getMappedPort(8545)}`
        )
      );
      const wallet = await Web3EthereumWallet.newInstance(web3, privateKey);

      const amountFounded = await fundAddressOfPrivateKey(web3, privateKey);
      const amountToTransfer = amountFounded.divn(2);
      const gasPrice = new BN(0);

      const balanceBefore = await web3.eth.getBalance(targetAddress);
      const receipt = await wallet.sendTransactionTo({
        to: targetAddress,
        value: amountToTransfer,
        gasPrice,
        gasLimit: new BN(100_000)
      });
      const balanceAfter = await web3.eth.getBalance(targetAddress);

      const gasCost = new BN(receipt.gasUsed).mul(gasPrice);
      const expectedBalance = new BN(balanceBefore, 10)
        .add(amountToTransfer)
        .sub(gasCost)
        .toString(10);

      expect(balanceAfter).toEqual(expectedBalance);
    }),
    50000
  );

  test(
    "should be able to deploy and invoke greeter contract",
    containerTest(parityTestContainer, async ({ container }) => {
      const web3 = new Web3(
        new Web3.providers.HttpProvider(
          `http://localhost:${container.getMappedPort(8545)}`
        )
      );
      const wallet = await Web3EthereumWallet.newInstance(web3, privateKey);

      await fundAddressOfPrivateKey(web3, privateKey);

      const deploymentReceipt = await wallet.deployContract({
        gasPrice: new BN(0),
        gasLimit: new BN(1_000_000),
        data: greeterContractCode
      });
      expect(deploymentReceipt.contractAddress).not.toBeUndefined();

      // wait for parity to mine the transaction
      // parity sometimes takes up to 4 seconds to actually mine the transaction even though it already returned the receipt. this is how we cater for that.
      // See https://github.com/paritytech/parity-ethereum/issues/10672 for details
      await sleep(10000);

      const contract = new web3.eth.Contract(GreeterABI);
      const methodCall = contract.methods.greet("Thomas").encodeABI();

      // need to trim `0x` from generated data
      const invocationData = Buffer.from(methodCall.substring(2), "hex");

      const receipt = await wallet.sendTransactionTo({
        // @ts-ignore
        to: deploymentReceipt.contractAddress,
        gasPrice: new BN(10),
        gasLimit: new BN(1_000_000),
        data: invocationData
      });

      expect(receipt.logs).toHaveLength(1);

      // @ts-ignore
      const data = receipt.logs[0].data;
      const logData = Buffer.from(data.substring(2), "hex").toString("utf8");

      expect(logData).toContain("Hello");
      expect(logData).toContain("Thomas");
    }),
    30000
  );

  test(
    "given initial funding, returns the correct balance",
    containerTest(parityTestContainer, async ({ container }) => {
      const web3 = new Web3(
        new Web3.providers.HttpProvider(
          `http://localhost:${container.getMappedPort(8545)}`
        )
      );
      const wallet = await Web3EthereumWallet.newInstance(web3, privateKey);

      const amountFounded = await fundAddressOfPrivateKey(web3, privateKey);
      const balance = await wallet.getBalance(Asset.ether);
      const balanceAfter = web3.utils.toWei(balance.toFixed(10));
      expect(balanceAfter.toString()).toEqual(amountFounded.toString());
    }),
    20000
  );

  test(
    "given deployed ERC20 token contract and initial minting, returns the balance",
    containerTest(parityTestContainer, async ({ container }) => {
      const web3 = new Web3(
        new Web3.providers.HttpProvider(
          `http://localhost:${container.getMappedPort(8545)}`
        )
      );
      const wallet = await Web3EthereumWallet.newInstance(web3, privateKey);
      const address = await wallet.getAddress();

      await fundAddressOfPrivateKey(web3, privateKey);

      // Deploy token contract
      const deploymentReceipt = await wallet.deployContract({
        gasPrice: new BN(0),
        gasLimit: new BN(4_000_000),
        data: tokenContractCode
      });
      const contractAddress = deploymentReceipt.contractAddress;
      expect(contractAddress).not.toBeUndefined();

      // wait for parity to mine the transaction
      // parity sometimes takes up to 4 seconds to actually mine the transaction even though it already returned the receipt. this is how we cater for that.
      // See https://github.com/paritytech/parity-ethereum/issues/10672 for details
      await sleep(5000);

      // Mint some tokens
      const contract = new web3.eth.Contract(Erc20ABI);
      const mintMethodCall = contract.methods
        .mint(address, "12000340000000000000000")
        .encodeABI();

      // need to trim `0x` from generated data
      const invocationData = Buffer.from(mintMethodCall.substring(2), "hex");

      const mintReceipt = await wallet.sendTransactionTo({
        // @ts-ignore
        to: deploymentReceipt.contractAddress,
        gasPrice: new BN(10),
        gasLimit: new BN(1_000_000),
        data: invocationData
      });
      expect(mintReceipt.logs).toHaveLength(1);

      const tokenAsset = new Asset(
        "testToken",
        Ledger.Ethereum,
        contractAddress,
        18
      );
      const actualBalance = await wallet.getBalance(tokenAsset);

      expect(actualBalance).toEqual(new Big(12000.34));
    }),
    20000
  );
});
