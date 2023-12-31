import { BigNumber, Contract, providers, ethers, utils } from "ethers";

import usdcTknAbi from "../artifacts/contracts/USDCoin.sol/USDCoin.json";
import miPrimerTknAbi from "../artifacts/contracts/MiPrimerToken.sol/UpgradeableMiPrimerToken.json";
import publicSaleAbi from "../artifacts/contracts/PublicSale.sol/PublicSale.json";
import nftTknAbi from "../artifacts/contracts/NFT.sol/MiPrimerNft.json";

window.ethers = ethers;

var provider, signer, account;
var usdcTkContract, miPrTokenContract, nftTknContract, pubSContract;

// REQUIRED
// Conectar con metamask
function initSCsGoerli() {
  provider = new providers.Web3Provider(window.ethereum);

  var usdcAddress = "0x42Ea21071951be8CE1b0ce243C293bb65DC2f0A0";
  var miPrTknAdd = "0x4faF3aea076786730FF756e3849E450B503bEc3D";
  var pubSContractAdd = "0x98b613b8E54EC530dFD452319E9DAc6e39047557";

  usdcTkContract = new Contract(usdcAddress, usdcTknAbi.abi, provider); // = Contract...
  miPrTokenContract = new Contract(miPrTknAdd, miPrimerTknAbi.abi, provider); // = Contract...
  pubSContract = new Contract(pubSContractAdd, publicSaleAbi.abi, provider); // = Contract...
}

// OPTIONAL
// No require conexion con Metamask
// Usar JSON-RPC
// Se pueden escuchar eventos de los contratos usando el provider con RPC
function initSCsMumbai() {
  var nftAddress = "0x1dC865e29eAE80B51362321Fffb5F951CB1bC3f2";
  nftTknContract = new Contract(nftAddress, nftTknAbi.abi, provider); // = new Contract...
}

function setUpListeners() {
  // Connect to Metamask
  var bttn = document.getElementById("connect");
  bttn.addEventListener("click", async function () {
    if (window.ethereum) {
      [account] = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Billetera metamask", account);

      // provider: Metamask: estamos usando window.ethereum
      provider = new providers.Web3Provider(window.ethereum);
      // signer: el que va a firmar las tx
      signer = provider.getSigner(account);
      window.signer = signer;
    }
  });

  var bttnUSDC = document.getElementById("usdcUpdate");
  bttnUSDC.addEventListener("click", async function () {
    var balanceUSDC = await usdcTkContract.connect(signer).balanceOf(account);
    var spanUSDC = document.getElementById("usdcBalance");
    spanUSDC.innerHTML = `${balanceUSDC}`;
  });

  var bttnMPTKN = document.getElementById("miPrimerTknUpdate");
  bttnMPTKN.addEventListener("click", async function () {
    var balanceMPTKN = await miPrTokenContract
      .connect(signer)
      .balanceOf(account);
    var spanMPKTN = document.getElementById("miPrimerTknBalance");
    spanMPKTN.innerHTML = `${balanceMPTKN}`;
  });

  var bttnAllowanceMPTKN = document.getElementById("approveButton");
  bttnAllowanceMPTKN.addEventListener("click", async function () {
    var approveInput = document.getElementById("approveInput");
    console.log(approveInput.value);
    try {
      var tx = await miPrTokenContract
        .connect(signer)
        .approve(
          "0x98b613b8E54EC530dFD452319E9DAc6e39047557",
          approveInput.value
        );
      var response = await tx.wait();
      var transactionHash = response.transactionHash;
      console.log("Tx hash", transactionHash);
      //First TX = 0x8ba4f998fa7ff29cebab1e270a37ecf3e42ecad5b064c17529fcea243a4ac028
    } catch (error) {
      console.log(error.reason);
    }
  });

  var bttnpurchaseButton = document.getElementById("purchaseButton");
  bttnpurchaseButton.addEventListener("click", async function () {
    var purchaseInput = document.getElementById("purchaseInput");
    try {
      var txPurchase = await pubSContract
        .connect(signer)
        .purchaseNftById(purchaseInput.value);
      var responseTxPurchase = await txPurchase.wait();
      var transactionHash = responseTxPurchase.transactionHash;
      console.log("Tx hash", transactionHash);

      var nftList = document.getElementById("nftList");
      var child = document.createElement("p");
      child.innerHTML = `Transfer from 0x0000000000000000000000000000000000000000 to ${account} tokenId ${purchaseInput.value}`;
      nftList.appendChild(child);
    } catch (error) {
      console.log(error.reason);
    }
  });

  var purchaseEthButton = document.getElementById("purchaseEthButton");
  purchaseEthButton.addEventListener("click", async function () {
    try {
      var txPurchase = await pubSContract
        .connect(signer)
        .depositEthForARandomNft({"value":utils.parseEther("0.01")});
      var responseTxPurchase = await txPurchase.wait();
      var transactionHash = responseTxPurchase.transactionHash;     

    } catch (error) {
      console.log(error.reason);
    }
  });

  var sendEtherButton = document.getElementById("sendEtherButton");
  sendEtherButton.addEventListener("click", async function () {
    try {
    
      await signer.sendTransaction({"to":pubSContract.address,"value":utils.parseEther("0.01")});
      
    } catch (error) {
      console.log(error.reason);
    }
  });
}

function setUpEventsContracts() {
  //Se escucha el evento transfer del ERC721 en el contrato de NFT
  nftTknContract.on("Transfer", (adrressZer0,ownerNFT, idNFT) => {
    var nftTransferList = document.getElementById("nftList");
    var child = document.createElement("li");
    child.innerText = `Transfer from ${adrressZer0} to ${ownerNFT} tokenId ${idNFT}`;
    nftTransferList.appendChild(child);
  });

}

async function setUp() {
  initSCsGoerli();
  initSCsMumbai();
  await setUpListeners();
  setUpEventsContracts();
}



setUp()
  .then()
  .catch((e) => console.log(e));


