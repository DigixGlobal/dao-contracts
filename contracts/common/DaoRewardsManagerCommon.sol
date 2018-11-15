pragma solidity 0.4.25;

import "./DaoCommonMini.sol";
import "./../lib/DaoStructs.sol";

contract DaoRewardsManagerCommon is DaoCommonMini {

    using DaoStructs for DaoStructs.DaoQuarterInfo;

    // this is a struct that store information relevant for calculating the user rewards
    // for the last participating quarter
    struct UserRewards {
        uint256 lastParticipatedQuarter;
        uint256 lastQuarterThatRewardsWasUpdated;
        DaoStructs.DaoQuarterInfo qInfo;
        uint256 effectiveDGDBalance;
        uint256 effectiveModeratorDGDBalance;
    }

    // struct to store variables needed in the execution of calculateGlobalRewardsBeforeNewQuarter
    struct QuarterRewardsInfo {
        uint256 previousQuarter;
        uint256 totalEffectiveDGDPreviousQuarter;
        bool doneCalculatingEffectiveBalance;
        bool doneCalculatingModeratorEffectiveBalance;
        uint256 totalEffectiveModeratorDGDLastQuarter;
        uint256 dgxRewardsPoolLastQuarter;
        DaoStructs.DaoQuarterInfo qInfo;
        address currentUser;
        uint256 userCount;
        uint256 i;
        address[] users;
    }

    // get the struct for the relevant information for calculating a user's DGX rewards for the last participated quarter
    function getUserRewardsStruct(address _user)
        internal
        view
        returns (UserRewards memory _data)
    {
        _data.lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(_user);
        _data.lastQuarterThatRewardsWasUpdated = daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user);
        _data.qInfo = readQuarterInfo(_data.lastParticipatedQuarter);
    }

    // read the DaoQuarterInfo struct of a certain quarter
    function readQuarterInfo(uint256 _quarterNumber)
        internal
        view
        returns (DaoStructs.DaoQuarterInfo _qInfo)
    {
        (
            _qInfo.minimalParticipationPoint,
            _qInfo.quarterPointScalingFactor,
            _qInfo.reputationPointScalingFactor,
            _qInfo.totalEffectiveDGDPreviousQuarter
        ) = daoRewardsStorage().readQuarterParticipantInfo(_quarterNumber);
        (
            _qInfo.moderatorMinimalParticipationPoint,
            _qInfo.moderatorQuarterPointScalingFactor,
            _qInfo.moderatorReputationPointScalingFactor,
            _qInfo.totalEffectiveModeratorDGDLastQuarter
        ) = daoRewardsStorage().readQuarterModeratorInfo(_quarterNumber);
        (
            _qInfo.dgxDistributionDay,
            _qInfo.dgxRewardsPoolLastQuarter,
            _qInfo.sumRewardsFromBeginning
        ) = daoRewardsStorage().readQuarterGeneralInfo(_quarterNumber);
    }
}
