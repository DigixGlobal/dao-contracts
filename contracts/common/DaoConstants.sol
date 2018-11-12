pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';


contract DaoConstants {
    using SafeMath for uint256;
    bytes32 EMPTY_BYTES = bytes32(0x0);
    address EMPTY_ADDRESS = address(0x0);

    bytes32 PROPOSAL_STATE_PREPROPOSAL = "proposal_state_preproposal";
    bytes32 PROPOSAL_STATE_DRAFT = "proposal_state_draft";
    bytes32 PROPOSAL_STATE_MODERATED = "proposal_state_moderated";
    bytes32 PROPOSAL_STATE_ONGOING = "proposal_state_ongoing";
    bytes32 PROPOSAL_STATE_CLOSED = "proposal_state_closed";

    uint256 PRL_ACTION_STOP = 1;
    uint256 PRL_ACTION_PAUSE = 2;
    uint256 PRL_ACTION_UNPAUSE = 3;

    uint256 COLLATERAL_STATUS_UNLOCKED = 1;
    uint256 COLLATERAL_STATUS_LOCKED = 2;
    uint256 COLLATERAL_STATUS_CLAIMED = 3;

    bytes32 INTERMEDIATE_DGD_IDENTIFIER = "inter_dgd_id";
    bytes32 INTERMEDIATE_MODERATOR_DGD_IDENTIFIER = "inter_mod_dgd_id";
    bytes32 INTERMEDIATE_BONUS_CALCULATION_IDENTIFIER = "inter_bonus_calculation_id";

    // interactive contracts
    bytes32 CONTRACT_DAO = "dao";
    bytes32 CONTRACT_DAO_SPECIAL_PROPOSAL = "dao:special:proposal";
    bytes32 CONTRACT_DAO_STAKE_LOCKING = "dao:stake-locking";
    bytes32 CONTRACT_DAO_VOTING = "dao:voting";
    bytes32 CONTRACT_DAO_VOTING_CLAIMS = "dao:voting:claims";
    bytes32 CONTRACT_DAO_SPECIAL_VOTING_CLAIMS = "dao:svoting:claims";
    bytes32 CONTRACT_DAO_IDENTITY = "dao:identity";
    bytes32 CONTRACT_DAO_REWARDS_MANAGER = "dao:rewards-manager";
    bytes32 CONTRACT_DAO_REWARDS_MANAGER_EXTRAS = "dao:rewards-extras";
    bytes32 CONTRACT_DAO_ROLES = "dao:roles";
    bytes32 CONTRACT_DAO_FUNDING_MANAGER = "dao:funding-manager";
    bytes32 CONTRACT_DAO_WHITELISTING = "dao:whitelisting";

    // service contracts
    bytes32 CONTRACT_SERVICE_ROLE = "service:role";
    bytes32 CONTRACT_SERVICE_DAO_INFO = "service:dao:info";
    bytes32 CONTRACT_SERVICE_DAO_LISTING = "service:dao:listing";
    bytes32 CONTRACT_SERVICE_DAO_CALCULATOR = "service:dao:calculator";

    // storage contracts
    bytes32 CONTRACT_STORAGE_DAO = "storage:dao";
    bytes32 CONTRACT_STORAGE_DAO_UPGRADE = "storage:dao:upgrade";
    bytes32 CONTRACT_STORAGE_DAO_IDENTITY = "storage:dao:identity";
    bytes32 CONTRACT_STORAGE_DAO_POINTS = "storage:dao:points";
    bytes32 CONTRACT_STORAGE_DAO_SPECIAL = "storage:dao:special";
    bytes32 CONTRACT_STORAGE_DAO_CONFIG = "storage:dao:config";
    bytes32 CONTRACT_STORAGE_DAO_STAKE = "storage:dao:stake";
    bytes32 CONTRACT_STORAGE_DAO_REWARDS = "storage:dao:rewards";
    bytes32 CONTRACT_STORAGE_DAO_WHITELISTING = "storage:dao:whitelisting";
    bytes32 CONTRACT_STORAGE_INTERMEDIATE_RESULTS = "storage:intermediate:results";
    bytes32 CONTRACT_STORAGE_DAO_COLLATERAL = "storage:dao:collateral";

    bytes32 CONTRACT_DGD_TOKEN = "t:dgd";
    bytes32 CONTRACT_DGX_TOKEN = "t:dgx";
    bytes32 CONTRACT_BADGE_TOKEN = "t:badge";

    uint8 ROLES_ROOT = 1;
    uint8 ROLES_FOUNDERS = 2;
    uint8 ROLES_PRLS = 3;
    uint8 ROLES_KYC_ADMINS = 4;

    uint256 QUARTER_DURATION = 90 days;

    bytes32 CONFIG_MINIMUM_LOCKED_DGD = "min_dgd_participant";
    bytes32 CONFIG_MINIMUM_DGD_FOR_MODERATOR = "min_dgd_moderator";
    bytes32 CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR = "min_reputation_moderator";

    bytes32 CONFIG_LOCKING_PHASE_DURATION = "locking_phase_duration";
    bytes32 CONFIG_QUARTER_DURATION = "quarter_duration";
    bytes32 CONFIG_VOTING_COMMIT_PHASE = "voting_commit_phase";
    bytes32 CONFIG_VOTING_PHASE_TOTAL = "voting_phase_total";
    bytes32 CONFIG_INTERIM_COMMIT_PHASE = "interim_voting_commit_phase";
    bytes32 CONFIG_INTERIM_PHASE_TOTAL = "interim_voting_phase_total";

    bytes32 CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR = "draft_quorum_fixed_numerator";
    bytes32 CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR = "draft_quorum_fixed_denominator";
    bytes32 CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR = "draft_quorum_sfactor_numerator";
    bytes32 CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR = "draft_quorum_sfactor_denominator";
    bytes32 CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR = "vote_quorum_fixed_numerator";
    bytes32 CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR = "vote_quorum_fixed_denominator";
    bytes32 CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR = "vote_quorum_sfactor_numerator";
    bytes32 CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR = "vote_quorum_sfactor_denominator";
    bytes32 CONFIG_FINAL_REWARD_SCALING_FACTOR_NUMERATOR = "final_reward_sfactor_numerator";
    bytes32 CONFIG_FINAL_REWARD_SCALING_FACTOR_DENOMINATOR = "final_reward_sfactor_denominator";

    bytes32 CONFIG_DRAFT_QUOTA_NUMERATOR = "draft_quota_numerator";
    bytes32 CONFIG_DRAFT_QUOTA_DENOMINATOR = "draft_quota_denominator";
    bytes32 CONFIG_VOTING_QUOTA_NUMERATOR = "voting_quota_numerator";
    bytes32 CONFIG_VOTING_QUOTA_DENOMINATOR = "voting_quota_denominator";

    bytes32 CONFIG_MINIMAL_QUARTER_POINT = "minimal_qp";
    bytes32 CONFIG_QUARTER_POINT_SCALING_FACTOR = "quarter_point_scaling_factor";
    bytes32 CONFIG_REPUTATION_POINT_SCALING_FACTOR = "rep_point_scaling_factor";

    bytes32 CONFIG_MODERATOR_MINIMAL_QUARTER_POINT = "minimal_mod_qp";
    bytes32 CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR = "mod_qp_scaling_factor";
    bytes32 CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR = "mod_rep_point_scaling_factor";

    bytes32 CONFIG_QUARTER_POINT_DRAFT_VOTE = "quarter_point_draft_vote";
    bytes32 CONFIG_QUARTER_POINT_VOTE = "quarter_point_vote";
    bytes32 CONFIG_QUARTER_POINT_INTERIM_VOTE = "quarter_point_interim_vote";
    bytes32 CONFIG_QUARTER_POINT_CLAIM_RESULT = "quarter_point_claim_result";

    /// this is per 10000 ETHs
    bytes32 CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH = "q_p_milestone_completion";

    bytes32 CONFIG_BONUS_REPUTATION_NUMERATOR = "bonus_reputation_numerator";
    bytes32 CONFIG_BONUS_REPUTATION_DENOMINATOR = "bonus_reputation_denominator";

    bytes32 CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE = "special_proposal_commit_phase";
    bytes32 CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL = "special_proposal_phase_total";

    bytes32 CONFIG_SPECIAL_QUOTA_NUMERATOR = "config_special_quota_numerator";
    bytes32 CONFIG_SPECIAL_QUOTA_DENOMINATOR = "config_special_quota_denominator";

    bytes32 CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR = "special_quorum_numerator";
    bytes32 CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR = "special_quorum_denominator";

    bytes32 CONFIG_MAXIMUM_REPUTATION_DEDUCTION = "config_max_reputation_deduction";
    bytes32 CONFIG_PUNISHMENT_FOR_NOT_LOCKING = "config_punishment_not_locking";

    bytes32 CONFIG_REPUTATION_PER_EXTRA_QP_NUM = "config_rep_per_extra_qp_num";
    bytes32 CONFIG_REPUTATION_PER_EXTRA_QP_DEN = "config_rep_per_extra_qp_den";

    bytes32 CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION = "config_max_m_rp_deduction";
    bytes32 CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM = "config_rep_per_extra_m_qp_num";
    bytes32 CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN = "config_rep_per_extra_m_qp_den";

    bytes32 CONFIG_PORTION_TO_MODERATORS_NUM = "config_mod_portion_num";
    bytes32 CONFIG_PORTION_TO_MODERATORS_DEN = "config_mod_portion_den";

    bytes32 CONFIG_DRAFT_VOTING_PHASE = "config_draft_voting_phase";

    bytes32 CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE = "config_rp_boost_per_badge";

    bytes32 CONFIG_VOTE_CLAIMING_DEADLINE = "config_claiming_deadline";

    bytes32 CONFIG_PREPROPOSAL_DEPOSIT = "config_preproposal_deposit";

    bytes32 CONFIG_MAX_FUNDING_FOR_NON_DIGIX = "config_max_funding_nonDigix";
    bytes32 CONFIG_MAX_MILESTONES_FOR_NON_DIGIX = "config_max_milestones_nonDigix";
    bytes32 CONFIG_NON_DIGIX_PROPOSAL_CAP_PER_QUARTER = "config_nonDigix_proposal_cap";

    bytes32 CONFIG_PROPOSAL_DEAD_DURATION = "config_dead_duration";
    bytes32 CONFIG_CARBON_VOTE_REPUTATION_BONUS = "config_cv_reputation";
}
