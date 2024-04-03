// SPDX-License-Identifier: MIT

import "../Dependencies/IERC20.sol";

pragma solidity 0.6.11;


contract ETHTransferScript {

    address immutable stETHAddress2;

    constructor(address _stETHAddress) public {
        stETHAddress2 = _stETHAddress;
    }

    function transferETH(address _recipient, uint256 _amount) external returns (bool) {
        IERC20(stETHAddress2).transfer(_recipient, _amount);
        return true;
    }
}
