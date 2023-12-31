const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const { getRole, deploySC, deploySCNoUp, ex, pEth } = require("../utils");

const MINTER_ROLE = getRole("MINTER_ROLE");
const BURNER_ROLE = getRole("BURNER_ROLE");

// 17 de Junio del 2023 GMT
var startDate = 1686960000;

var makeBN = (num) => ethers.BigNumber.from(String(num));

describe("MI PRIMER TOKEN TESTING", function () {
  var nftContract, publicSale, miPrimerToken, usdc;
  var owner, gnosis, alice, bob, carl, deysi;
  var name = "MiPrimerNFT";
  var symbol = "MPRNFT";
  const cienmilTokens = pEth("100000");
  const diezmilTokens = pEth("10000");
  before(async () => {
    [owner, gnosis, alice, bob, carl, deysi] = await ethers.getSigners();
  });

  // Estos dos métodos a continuación publican los contratos en cada red
  // Se usan en distintos tests de manera independiente
  // Ver ejemplo de como instanciar los contratos en deploy.js
  async function deployNftSC() {
    nftContract = await deploySC("MiPrimerNft", []);
   // nftContract["grantRole(bytes32,address)"](MINTER_ROLE, alice.address);
    await ex(nftContract, "grantRole", [MINTER_ROLE, alice.address]);
  }

  async function deployPublicSaleSC() {
    miPrimerToken = await deploySC("UpgradeableMiPrimerToken", []);
    publicSale = await deploySC("PublicSale", []);
    await ex(publicSale, "setMiPrimerToken", [miPrimerToken.address], "Token");
    await ex(publicSale, "setGenosisSafe", [gnosis.address], "SGW");
    //await ex(publicSale, "purchaseNftById", [30], "Setup Number NFTs");
    await ex(miPrimerToken, "mint" , [bob.address, cienmilTokens], "TKN Mint");
  }

  describe("Mi Primer Nft Smart Contract", () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployNftSC();
    });

    it("Verifica nombre colección", async () => {
      expect(await nftContract.name()).to.be.equal(name);
    });

    it("Verifica símbolo de colección", async () => {
      expect(await nftContract.symbol()).to.be.equal(symbol);
    });

    it("No permite acuñar sin privilegio", async () => {
      var msgError = "AccessControl: account " + bob.address.toLowerCase() + " is missing role " + MINTER_ROLE;
      //var msgError = "No tiene privilegio para acuñar NFT";
      await expect(nftContract.connect(bob).safeMint(bob.address,1)).to.be.revertedWith(msgError);
    });

    it("No permite acuñar doble id de Nft", async () => {
      var msgError = "The token was mint before";
      await nftContract.connect(alice).safeMint(bob.address,1);
      await expect(nftContract.connect(alice).safeMint(bob.address,1)).to.be.revertedWith(msgError);
    });

    it("Verifica rango de Nft: [1, 30]", async () => {
      // Mensaje error: "NFT: Token id out of range"
      var msgError = "Public Sale: id must be between 1 and 30";
      await expect(nftContract.connect(alice).safeMint(bob.address,30)).to.be.revertedWith(msgError);
    });

    it("Se pueden acuñar todos (30) los Nfts", async () => {
      for(let i=0; i < 30 ; i++){
        expect(await nftContract.connect(alice).safeMint(bob.address,i)).to.be.ok;
      }
    });
  });

  describe("Public Sale Smart Contract", () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployPublicSaleSC();
    });

    it("No se puede comprar otra vez el mismo ID", async () => {
      var msgError = "Public Sale: id not available";
      await miPrimerToken.connect(bob).approve(publicSale.address, diezmilTokens);
      await publicSale.connect(bob).purchaseNftById(1);
      await expect(publicSale.connect(bob).purchaseNftById(1)).to.be.revertedWith(msgError);
    });

    it("IDs aceptables: [1, 30]", async () => {
      var msgError = "NFT: Token id out of range";
      await miPrimerToken.connect(bob).approve(publicSale.address, diezmilTokens);
      await expect(publicSale.connect(bob).purchaseNftById(30)).to.be.revertedWith(msgError);
    });

    it("Usuario no dio permiso de MiPrimerToken a Public Sale", async () => {
      var msgError = "Public Sale: Not enough allowance";
      await miPrimerToken.connect(bob).approve(publicSale.address, 0);
      await expect(publicSale.connect(bob).purchaseNftById(1)).to.be.revertedWith(msgError);
    });

    it("Usuario no tiene suficientes MiPrimerToken para comprar", async () => {
      var msgError = "Public Sale: Not enough token balance";
      await miPrimerToken.connect(alice).approve(publicSale.address, diezmilTokens);
      await expect(publicSale.connect(alice).purchaseNftById(1)).to.be.revertedWith(msgError);
    });

    describe("Compra grupo 1 de NFT: 1 - 10", () => {
      var counter = 1;
      var priceNFT = 500;
      var feeGnosis = priceNFT * 0.1;
      var feePublicSale = priceNFT - feeGnosis;

      beforeEach(async () => {
        await miPrimerToken.connect(bob).approve(publicSale.address, cienmilTokens);
      })

      it("Emite evento luego de comprar", async () => {
        // modelo para validar si evento se disparo con correctos argumentos
        // var tx = await publicSale.purchaseNftById(id);
        // await expect(tx)
        //   .to.emit(publicSale, "DeliverNft")
        //   .withArgs(owner.address, counter);
        var tx = await publicSale.connect(bob).purchaseNftById(counter);
        await expect(tx).to.emit(publicSale, "DeliverNft").withArgs(bob.address, counter);
      });

      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        // Usar changeTokenBalance
        // source: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#change-token-balance
        balanceChange = pEth((-priceNFT).toString());
        await expect(publicSale.connect(bob).purchaseNftById(counter)).to.changeTokenBalance(miPrimerToken, bob, balanceChange);
      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        gnosisFee = pEth(feeGnosis.toString());
        await expect(publicSale.connect(bob).purchaseNftById(counter)).to.changeTokenBalance(miPrimerToken, gnosis, gnosisFee);
      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        publicSaleFee = pEth(feePublicSale.toString());
        await expect(publicSale.connect(bob).purchaseNftById(counter)).to.changeTokenBalance(miPrimerToken, publicSale, publicSaleFee);
      });
    });

    describe("Compra grupo 2 de NFT: 11 - 20", () => {
      var counter = 11;
      var priceNFT = counter * 1000;
      var feeGnosis = priceNFT * 0.1;
      var feePublicSale = priceNFT - feeGnosis;

      beforeEach(async () => {
        await miPrimerToken.connect(bob).approve(publicSale.address, cienmilTokens);
      })
      it("Emite evento luego de comprar", async () => {
        var tx = await publicSale.connect(bob).purchaseNftById(counter);
      });

      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        balanceChange = pEth((-priceNFT).toString());
        await expect(publicSale.connect(bob).purchaseNftById(counter)).to.changeTokenBalance(miPrimerToken, bob, balanceChange);
      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        gnosisFee = pEth(feeGnosis.toString());
        await expect(publicSale.connect(bob).purchaseNftById(counter)).to.changeTokenBalance(miPrimerToken, gnosis, gnosisFee);
      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        publicSaleFee = pEth(feePublicSale.toString());
        await expect(publicSale.connect(bob).purchaseNftById(counter)).to.changeTokenBalance(miPrimerToken, publicSale, publicSaleFee);
      });
    });

    describe("Compra grupo 3 de NFT: 21 - 30", () => {
      const startDate = 1686960000;
      const MAX_PRICE_NFT = 50000;
      var counter = 21;
      var priceNFT = 10000 + Math.floor((Date.now() - startDate)/3600)* 1000;
      priceNFT = priceNFT > MAX_PRICE_NFT ? MAX_PRICE_NFT : priceNFT;
      var feeGnosis = priceNFT * 0.1;
      var feePublicSale = priceNFT - feeGnosis;
      
      beforeEach(async () => {
        await miPrimerToken.connect(bob).approve(publicSale.address, cienmilTokens);
      })
      
      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        balanceChange = pEth((-priceNFT).toString());
        
        await expect(publicSale.connect(bob).purchaseNftById(counter)).to.changeTokenBalance(miPrimerToken, bob, balanceChange);
      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        gnosisFee = pEth(feeGnosis.toString());
        await expect(publicSale.connect(bob).purchaseNftById(counter)).to.changeTokenBalance(miPrimerToken, gnosis, gnosisFee);
      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        publicSaleFee = pEth(feePublicSale.toString());
        await expect(publicSale.connect(bob).purchaseNftById(counter)).to.changeTokenBalance(miPrimerToken, publicSale, publicSaleFee);
      });
    });

    describe("Depositando Ether para Random NFT", () => {
      it("Método emite evento (30 veces) ", async () => {
        for(var i=0; i<30;i++){
          var tx = await publicSale.connect(bob).depositEthForARandomNft({
            value: pEth("0.01"),
          });
          await expect(tx).to.emit(publicSale, "DeliverNft");
        }
      });

      it("Método falla la vez 31", async () => {
        for(var i=0; i<30;i++){
          var tx = await publicSale.connect(bob).depositEthForARandomNft({
            value: pEth("0.01"),
          });
          await expect(tx).to.emit(publicSale, "DeliverNft");
        }
          await expect(publicSale.connect(bob).depositEthForARandomNft({
            value: pEth("0.01"),
          })).to.be.revertedWith("NFT No disponible");
      });

      it("Envío de Ether y emite Evento (30 veces)", async () => {
        for(var i=0; i<30;i++){
          var tx = await bob.sendTransaction({
            to: publicSale.address,
            value: pEth("0.01")
          });
          await expect(tx).to.emit(publicSale, "DeliverNft");
      }}
      );

      it("Envío de Ether falla la vez 31", async () => {
        for(var i=0; i<30;i++){
          var tx = await bob.sendTransaction({
            to: publicSale.address,
            value: pEth("0.01")
          });
          await expect(tx).to.emit(publicSale, "DeliverNft");
        }
          await expect(bob.sendTransaction({
            to: publicSale.address,
            value: pEth("0.01")
          })).to.be.revertedWith("NFT No disponible");
        
      });

      it("Da vuelto cuando y gnosis recibe Ether", async () => {
        // Usar el método changeEtherBalances
        // Source: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#change-ether-balance-multiple-accounts
        // Ejemplo:
        // await expect(
        //   await owner.sendTransaction({
        //     to: publicSale.address,
        //     value: pEth("0.02"),
        //   })
        // ).to.changeEtherBalances(
        //   [owner.address, gnosis.address],
        //   [pEth("-0.01"), pEth("0.01")]
        // );
        var tx = await bob.sendTransaction({
          to: publicSale.address,
          value: pEth("0.02"),
        });
        await expect(tx).to.changeEtherBalances(
          [bob.address, gnosis.address], [pEth("-0.01"), pEth("0.01")]
        );
      });
    });
  });
});