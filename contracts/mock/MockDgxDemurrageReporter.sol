pragma solidity ^0.4.25;

import "@digix/solidity-core-libraries/contracts/Types.sol";
import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "./MockDgxDemurrageCalculator.sol";

/// @title Digix Gold Token Demurrage Reporter
/// @author Digix Holdings Pte Ltd
/// @notice This contract is used to keep a close estimate of how much demurrage fees would have been collected on Digix Gold Token if the demurrage fees is on.
/// @notice Anyone can call the function updateDemurrageReporter() to keep this contract updated to the lastest day. The more often this function is called the more accurate the estimate will be (but it can only be updated at most every 24hrs)
contract MockDgxDemurrageReporter is MockDgxDemurrageCalculator, Claimable {
    address[] public exempted_accounts;
    uint256 public last_demurrageable_balance; // the total balance of DGX in non-exempted accounts, at last_payment_timestamp
    uint256 public last_payment_timestamp;  // the last time this contract is updated
    uint256 public culmulative_demurrage_collected; // this is the estimate of the demurrage fees that would have been collected from start_of_report_period to last_payment_timestamp
    uint256 public start_of_report_period; // the timestamp when this contract started keeping track of demurrage fees

    using Types for Types.MutableTimestamp;

    constructor(address _token_address) public MockDgxDemurrageCalculator(_token_address)
    {
        start_of_report_period = now;
        last_payment_timestamp = now;
        updateDemurrageReporter();
    }

    function addExemptedAccount(address _account) public onlyOwner {
        exempted_accounts.push(_account);
    }

    function updateDemurrageReporter() public {
        Types.MutableTimestamp memory payment_timestamp;
        payment_timestamp.time.pre = last_payment_timestamp;
        payment_timestamp = payment_timestamp.advance_by(1 days);

        uint256 _base;
        uint256 _rate;
        (_base, _rate,,) = token().showDemurrageConfigs();

        culmulative_demurrage_collected += (payment_timestamp.in_units * last_demurrageable_balance * _rate) / _base;
        last_payment_timestamp = payment_timestamp.time.post;
        last_demurrageable_balance = getDemurrageableBalance();
    }

    function getDemurrageableBalance() internal view returns (uint256 _last_demurrageable_balance) {
        uint256 _total_supply = token().totalSupply();
        uint256 _no_demurrage_balance = 0;
        for (uint256 i=0;i<exempted_accounts.length;i++) {
            _no_demurrage_balance += token().balanceOf(exempted_accounts[i]);
        }
        _last_demurrageable_balance = _total_supply - _no_demurrage_balance;
    }

    function changeLastPaymentTimestamp(uint256 _new_last_payment_timestamp) public {
        last_payment_timestamp = _new_last_payment_timestamp;
    }
}
