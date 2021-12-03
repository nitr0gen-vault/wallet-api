// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev Enables the token to be both mintable by contract owner and capped total supply
 */
abstract contract Nitr0genCap is ERC20 {
    uint256 private _cap;

    constructor(uint256 cap_, uint8 decimals_) {
        require(cap_ > 0, "Nitr0genCap: cap is 0");
        _cap = cap_ * 10**decimals_;
    }

    function cap() public view returns (uint256) {
        return _cap;
    }

    function _mint(address account, uint256 amount) internal virtual override {
        require(totalSupply() + amount <= cap(), "Nitr0genCap: cap exceeded");
        super._mint(account, amount);
    }
}
