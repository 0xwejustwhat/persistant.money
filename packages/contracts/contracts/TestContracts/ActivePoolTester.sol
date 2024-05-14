// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../ActivePool.sol";
import "../Dependencies/IERC20.sol";

contract ActivePoolTester is ActivePool {
    
    function unprotectedIncreaseLUSDDebt(uint _amount) external {
        Debt  = Debt.add(_amount);
    }

    function unprotectedPayable(uint amount) external {
        IERC20(stETHAddress).transferFrom(msg.sender, address(this), amount);
        ETH = ETH.add(amount);
    }
}
