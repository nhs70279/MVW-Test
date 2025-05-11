// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPaymaster } from "@account-abstraction/contracts/interfaces/IPaymaster.sol";
import { PackedUserOperation } from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import { IEntryPoint } from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract WLDPaymaster is IPaymaster {
    IERC20 public immutable wldToken;
    address public admin;
    mapping(address => bool) public whitelist;
    IEntryPoint public immutable entryPoint;

    constructor(IEntryPoint _entryPoint, address _wldToken) {
        wldToken = IERC20(_wldToken);
        admin = msg.sender;
        entryPoint = _entryPoint;
    }

    function setWhitelist(address user, bool allowed) external {
        require(msg.sender == admin, "not admin");
        whitelist[user] = allowed;
    }

    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32,
        uint256 maxCost
    ) external override returns (bytes memory context, uint256 validationData) {
        require(msg.sender == address(entryPoint), "only entrypoint");
        require(whitelist[userOp.sender], "sender not whitelisted");
        require(wldToken.balanceOf(userOp.sender) >= maxCost, "Insufficient WLD for gas");
        return ("", 0);
    }

    function postOp(
        IPaymaster.PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) external override {
        require(msg.sender == address(entryPoint), "only entrypoint");
        require(wldToken.transferFrom(tx.origin, address(this), actualGasCost), "WLD transfer failed");
    }

    function withdrawWLD(address to, uint256 amount) external {
        require(msg.sender == admin, "not admin");
        wldToken.transfer(to, amount);
    }
}