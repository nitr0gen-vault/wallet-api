// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./opts/standard.sol";
import "./opts/mintable.sol";
import "./opts/capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @dev Creates standard Nitr0gen token that is mintable, burnable and has the total supply capped
 */
contract Nitr0genMintBurnCap is
    Nitr0genMintable,
    ERC20Burnable,
    Nitr0genCap,
    Nitr0genStd
{
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals_,
        uint256 cap_
    )
        Nitr0genCap(cap_, decimals_)
        Nitr0genStd(name, symbol, initialSupply, decimals_)
    {}

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

    /**
     * @dev Uses the capped mint function not the default uncapped
     */
    function _mint(address account, uint256 amount)
        internal
        virtual
        override(ERC20, Nitr0genCap)
    {
        Nitr0genCap._mint(account, amount);
    }
}
