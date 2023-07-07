// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract PublicSale is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Mi Primer Token
    // Crear su setter
    IERC20Upgradeable miPrimerToken;

    function setMiPrimerToken(address _to) public {
        miPrimerToken = IERC20Upgradeable(_to);
    }

    // 17 de Junio del 2023 GMT
    uint256 constant startDate = 1686960000;

    // Maximo price NFT
    uint256 constant MAX_PRICE_NFT = 50000 * 10 ** 18;

    // Gnosis Safe
    // Crear su setter
    address gnosisSafeWallet;

    // 0x3646DB6CefB1336f3FB813273b572Ae1fba4B374
    function setGenosisSafe(address _to) public {
        gnosisSafeWallet = address(_to);
    }

    function transferSafe(address _to, uint256 amount) public {
        miPrimerToken.transferFrom(_to, gnosisSafeWallet, amount);
    }

    event DeliverNft(address winnerAccount, uint256 nftId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    mapping(uint256 => bool) existNFT;

    function purchaseNftById(uint256 _id) external {
        // Realizar 3 validaciones:
        // 1 - el id no se haya vendido. Sugerencia: llevar la cuenta de ids vendidos
        //         * Mensaje de error: "Public Sale: id not available"
        require(!existNFT[_id], "Public Sale: id not available");
        // 2 - el msg.sender haya dado allowance a este contrato en suficiente de MPRTKN
        //         * Mensaje de error: "Public Sale: Not enough allowance"
        uint256 priceNft = _getPriceById(_id);
        require(
            miPrimerToken.allowance(msg.sender, address(this)) >= priceNft,
            "Public Sale: Not enough allowance"
        );
        // 3 - el msg.sender tenga el balance suficiente de MPRTKN
        //         * Mensaje de error: "Public Sale: Not enough token balance"
        require(
            miPrimerToken.balanceOf(msg.sender) >= priceNft,
            "Public Sale: Not enough token balance"
        );
        // 4 - el _id se encuentre entre 1 y 30
        //         * Mensaje de error: "NFT: Token id out of range"
        require(_id > 0 && _id < 30, "NFT: Token id out of range");
        // Obtener el precio segun el id

        // Purchase fees
        // 10% para Gnosis Safe (fee)
        // 90% se quedan en este contrato (net)
        // from: msg.sender - to: gnosisSafeWallet - amount: fee
        miPrimerToken.transferFrom(
            msg.sender,
            gnosisSafeWallet,
            (priceNft * 10) / 100
        );
        // from: msg.sender - to: address(this) - amount: net
        miPrimerToken.transferFrom(
            msg.sender,
            address(this),
            (priceNft * 90) / 100
        );
        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
        emit DeliverNft(msg.sender, _id);
    }

    function depositEthForARandomNft() public payable {
        // Realizar 2 validaciones
        // 1 - que el msg.value sea mayor o igual a 0.01 ether
        require(msg.value >= 0.01 ether, "Must send more than 0 token");
        // 2 - que haya NFTs disponibles para hacer el random
        // Escgoer una id random de la lista de ids disponibles
        uint256 nftId = _getRandomNftId();
        require(!existNFT[nftId], "The NFT selected don't available");

        // Enviar ether a Gnosis Safe
        // SUGERENCIA: Usar gnosisSafeWallet.call para enviar el ether
        // Validar los valores de retorno de 'call' para saber si se envio el ether correctamente
        (bool success, bytes memory error) = payable(gnosisSafeWallet).call{
            value: 0.01 ether
        }("");
        // Dar el cambio al usuario
        // El vuelto seria equivalente a: msg.value - 0.01 ether
        if (msg.value > 0.01 ether) {
            // logica para dar cambio
            // usar '.transfer' para enviar ether de vuelta al usuario
            payable(msg.sender).transfer(msg.value - 0.01 ether);
        }

        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
        emit DeliverNft(msg.sender, nftId);
    }

    // PENDING
    // Crear el metodo receive
    function receive() external payable {
        depositEthForARandomNft();
    }

    ////////////////////////////////////////////////////////////////////////
    /////////                    Helper Methods                    /////////
    ////////////////////////////////////////////////////////////////////////

    // Devuelve un id random de NFT de una lista de ids disponibles

    function _getRandomNftId() internal view returns (uint256) {
        uint256 count;
        for (uint256 i = 0; i < 30; i++) {
            if (!existNFT[i]) {
                count++;
            }
        }
        uint256[] memory array = new uint256[](count);
        uint256 indexArray = 0;
        for (uint256 i = 0; i < 30; i++) {
            if (!existNFT[i]) {
                array[indexArray] = i;
                indexArray++;
            }
        }
        uint256 indexRandomAvailable = uint256(
            keccak256(abi.encodePacked(block.timestamp, msg.sender))
        ) % count;
        return array[indexRandomAvailable];
    }

    // Según el id del NFT, devuelve el precio. Existen 3 grupos de precios
    function _getPriceById(uint256 _id) internal view returns (uint256) {
        uint256 priceGroupOne;
        uint256 priceGroupTwo;
        uint256 priceGroupThree;
        if (_id > 0 && _id < 11) {
            return priceGroupOne;
        } else if (_id > 10 && _id < 21) {
            return priceGroupTwo;
        } else {
            return priceGroupThree;
        }
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
