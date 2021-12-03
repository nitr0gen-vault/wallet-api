// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./opts/standard.sol";

/**
 * @dev Creates default BEP/ERC20 contract with decimal and initial supply setup
 */
contract Nitr0gen is Nitr0genStd {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals_
    ) Nitr0genStd(name, symbol, initialSupply, decimals_) {}
}
