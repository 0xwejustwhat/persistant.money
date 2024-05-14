// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/IANTUSDToken.sol";

contract ANTUSDTokenCaller {
    IANTUSDToken ANTUSD;

    function setANTUSD(IANTUSDToken _ANTUSD) external {
        ANTUSD = _ANTUSD;
    }

    function lusdMint(address _account, uint _amount) external {
        ANTUSD.mint(_account, _amount);
    }

    function lusdBurn(address _account, uint _amount) external {
        ANTUSD.burn(_account, _amount);
    }

    function lusdSendToPool(address _sender,  address _poolAddress, uint256 _amount) external {
        ANTUSD.sendToPool(_sender, _poolAddress, _amount);
    }

    function lusdReturnFromPool(address _poolAddress, address _receiver, uint256 _amount ) external {
        ANTUSD.returnFromPool(_poolAddress, _receiver, _amount);
    }
}
