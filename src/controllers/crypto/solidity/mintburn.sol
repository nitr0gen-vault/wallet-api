// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./opts/standard.sol";
import "./opts/mintable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @dev Creates standard Nitr0gen token that is mintable and burnable
 */
contract Nitr0genMintBurn is ERC20Burnable, Nitr0genMintable, Nitr0genStd {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals_
    ) Nitr0genStd(name, symbol, initialSupply, decimals_) {}

    /**
     * @dev Uses the dynamically set decimal not the default 18
     */
    function decimals()
        public
        view
        override(Nitr0genStd, ERC20)
        returns (uint8)
    {
        return super.decimals();
    }
}
