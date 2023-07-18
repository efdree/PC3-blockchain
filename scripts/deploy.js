require("dotenv").config();

const {
  getRole,
  verify,
  ex,
  printAddress,
  deploySC,
  deploySCNoUp,
} = require("../utils");

var MINTER_ROLE = getRole("MINTER_ROLE");
var BURNER_ROLE = getRole("BURNER_ROLE");

async function deployMumbai() {
  var relayerAddress = "0xa25330BE50EdCA39835a0EdD0208800f369795C3";
  var name = "Mi Primer NFT";
  var symbol = "MPRNFT";
  var nftContract = await deploySC("MiPrimerNft", []);
  var implementation = await printAddress("NFT", nftContract.address);

  // set up

  await ex(nftContract, "grantRole", [MINTER_ROLE, relayerAddress], "grantRole");

  console.log("nftToken Address: ", nftContract.address);

//NFT Proxy Address: 0x1dC865e29eAE80B51362321Fffb5F951CB1bC3f2
//NFT Impl Address: 0x6C5631E2E6792ECFdf4099C5725d7f97554D5b84
//nftToken Address:  0x1dC865e29eAE80B51362321Fffb5F951CB1bC3f2
}

async function deployGoerli() {
  // gnosis safe
  // Crear un gnosis safe en https://gnosis-safe.io/app/
  // Extraer el address del gnosis safe y pasarlo al contrato con un setter
  var gnosis = { address: "0x3646DB6CefB1336f3FB813273b572Ae1fba4B374" };



  // deploy usdc
  var usdCoin = await deploySCNoUp("USDCoin");
  console.log("usdcCoin Address: ", usdCoin.address);
  // deploy miprimertoken
  var miprimertoken = await deploySC("UpgradeableMiPrimerToken",[]);
  console.log("miprimerToken Address: ", miprimertoken.address);
  // deploy contrato compra venta
  var compraVenta = await deploySC("PublicSale", []);
  console.log("compraVenta Address: ", compraVenta.address);
  // npx hardhat --network run scripts/deploy.js

  await ex(compraVenta, "setMiPrimerToken", [miprimertoken.address], "setMiPrimerToken");
  await ex(compraVenta, "setGenosisSafe", [gnosis.address], "setGenosisSafe");
  //await ex(compraVenta, "purchaseNftById", [30], "purchaseNftById");


//USDCoin - Imp: 0x42Ea21071951be8CE1b0ce243C293bb65DC2f0A0
//usdcCoin Address:  0x42Ea21071951be8CE1b0ce243C293bb65DC2f0A0
//miprimerToken Address:  0x4faF3aea076786730FF756e3849E450B503bEc3D
//compraVenta Address:  0x98b613b8E54EC530dFD452319E9DAc6e39047557
}

//deployMumbai()
deployGoerli()
  //
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

