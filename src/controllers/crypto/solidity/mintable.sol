// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./opts/standard.sol";
import "./opts/mintable.sol";

/**
 * @dev Creates standard Nitr0gen token that is mintable
 */
contract Nitr0genMint is Nitr0genMintable, Nitr0genStd {
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
