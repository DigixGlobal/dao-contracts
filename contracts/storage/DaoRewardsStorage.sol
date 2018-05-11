pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

// this contract will receive DGXs fees from the DGX fees distributors
contract DaoRewardsStorage is ResolverClient, DaoConstants {

    struct DaoQuarterInfo {
        uint256 minimalParticipationPoint;
        uint256 quarterPointScalingFactor;
        uint256 totalEffectiveDGD;
        uint256 dgxDistributionDay; // the timestamp when DGX rewards is distributable to Holders
    }

    mapping(uint256 => DaoQuarterInfo) public allQuartersInfo;
    mapping(address => uint256) public claimableDGXs;

    function DaoRewardsStorage(address _resolver)
           public
    {
        require(init(CONTRACT_DAO_REWARDS_STORAGE, _resolver));
    }

    function updateQuarterInfo(
        uint256 _quarterIndex,
        uint256 _minimalParticipationPoint,
        uint256 _quarterPointScalingFactor,
        uint256 _totalEffectiveDGD,
        uint256 _dgxDistributionDay
    )
        if_sender_is(CONTRACT_DAO_REWARDS_MANAGER)
        public
    {
        allQuartersInfo[_quarterIndex].minimalParticipationPoint = _minimalParticipationPoint;
        allQuartersInfo[_quarterIndex].quarterPointScalingFactor = _quarterPointScalingFactor;
        allQuartersInfo[_quarterIndex].totalEffectiveDGD = _totalEffectiveDGD;
        allQuartersInfo[_quarterIndex].dgxDistributionDay = _dgxDistributionDay;
    }

    function updateClaimableDGX(address _user, uint256 _newClaimableDGX)
        if_sender_is(CONTRACT_DAO_REWARDS_MANAGER)
        public
    {
        claimableDGXs[_user] = _newClaimableDGX;
    }

}
