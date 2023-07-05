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
  var nftContract = await deploySC("MiPrimerNft", [name, symbol]);
  var implementation = await printAddress("NFT", nftContract.address);

  // set up
  await ex(nftTknContract, "grantRole", [MINTER_ROLE, relayerAddress], "grantRole");

  console.log("nftToken Address: ", nftContract.address);
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
  var miprimertoken = await deploySC("MiPrimerToken",[]);
  console.log("miprimerToken Address: ", miprimertoken.address);
  // deploy contrato compra venta
  var compraVenta = await deploySC("PublicSale", []);
  console.log("compraVenta Address: ", compraVenta.address);
  // npx hardhat --network run scripts/deploy.js

  await ex(compraVenta, "setMiPrimerToken", [miprimertoken.address], "setMiPrimerToken");
  await ex(compraVenta, "setGenosisWallet", [gnosis.address], "setGenosisWallet");
  await ex(compraVenta, "setNumberNFTs", [30], "setNumberNFTs");
}

//deployMumbai()
deployGoerli()
  //
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
