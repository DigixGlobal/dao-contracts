pragma solidity ^0.4.19;

contract DaoConstants {
  bytes32 EMPTY_BYTES = bytes32(0x0);
  address EMPTY_ADDRESS = address(0x0);
  uint256 PROPOSAL_STATE_PREPROPOSAL = 1;
  uint256 PROPOSAL_STATE_INITIAL = 2;
  uint256 PROPOSAL_STATE_VETTED = 3;
  uint256 PROPOSAL_STATE_FUNDED = 4;

  bytes32 CONTRACT_DAO_STAKE_LOCKING = "c:stake:locking";
  bytes32 CONTRACT_DAO = "c:dao";
  bytes32 CONTRACT_DAO_VOTING = "c:dao:voting";
  bytes32 CONTRACT_DAO_VOTING_CLAIMS = "c:dao:voting:claims";
  bytes32 CONTRACT_DAO_IDENTITY = "c:dao:identity";
  bytes32 CONTRACT_IDENTITY_STORAGE = "c:dao:identity:storage";
  bytes32 CONTRACT_DAO_REWARDS_MANAGER = "c:dao:rewards:manager";
  bytes32 CONTRACT_DAO_POINTS_STORAGE = "c:dao:points:storage";
  bytes32 CONTRACT_DAO_ROLES = "c:dao:roles";
  bytes32 CONTRACT_CONFIG_CONTROLLER = "c:config:controller";
  bytes32 CONTRACT_ROLE_SERVICE = "s:role";
  bytes32 CONTRACT_DAO_INFO_SERVICE = "s:dao:info";
  bytes32 CONTRACT_DAO_LISTING_SERVICE = "s:dao:listing";
  bytes32 CONTRACT_DAO_CALCULATOR_SERVICE = "s:dao:calculator";
  bytes32 CONTRACT_DAO_STORAGE = "s:dao:storage";
  bytes32 CONTRACT_DAO_SPECIAL_STORAGE = "s:dao:special:storage";
  bytes32 CONTRACT_DAO_CONFIG_STORAGE = "s:dao:config";
  bytes32 CONTRACT_DAO_STAKE_STORAGE = "s:stake";
  bytes32 CONTRACT_INTERACTIVE_QUARTER_POINT = "i:quarter:point";
  bytes32 CONTRACT_INTERACTIVE_REPUTATION_POINT = "i:reputation:point";
  bytes32 CONTRACT_DAO_FUNDING_MANAGER = "i:dao:fundingmanager";
  bytes32 CONTRACT_DAO_FUNDING_STORAGE = "s:dao:fundingstorage";
  bytes32 CONTRACT_DAO_REWARDS_STORAGE = "s:dao:rewardsstorage";

  bytes32 CONTRACT_DGD_TOKEN = "t:dgd";
  bytes32 CONTRACT_DGX_TOKEN = "t:dgx";
  bytes32 CONTRACT_BADGE_TOKEN = "t:badge";

  uint8 ROLES_ROOT = 1;
  uint8 ROLES_FOUNDERS = 2;
  uint8 ROLES_PRLS = 3;
  uint8 ROLES_KYC_ADMINS = 4;

  uint256 CONFIG_MINIMUM_LOCKED_DGD = 10 ** 9;
  uint256 QUARTER_DURATION = 90 days;

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

  bytes32 CONFIG_DRAFT_QUOTA_NUMERATOR = "draft_quota_numerator";
  bytes32 CONFIG_DRAFT_QUOTA_DENOMINATOR = "draft_quota_denominator";
  bytes32 CONFIG_VOTING_QUOTA_NUMERATOR = "voting_quota_numerator";
  bytes32 CONFIG_VOTING_QUOTA_DENOMINATOR = "voting_quota_denominator";

  bytes32 CONFIG_MINIMAL_PARTICIPATION_POINT = "CONFIG_MINIMAL_QP";
  bytes32 CONFIG_QUARTER_POINT_SCALING_FACTOR = "quarter_point_scaling_factor";
  bytes32 CONFIG_REPUTATION_POINT_SCALING_FACTOR = "rep_point_scaling_factor";

  bytes32 CONFIG_MINIMAL_BADGE_PARTICIPATION_POINT = "CONFIG_MINIMAL_B_QP";
  bytes32 CONFIG_BADGE_QUARTER_POINT_SCALING_FACTOR = "b_qp_scaling_factor";
  bytes32 CONFIG_BADGE_REPUTATION_POINT_SCALING_FACTOR = "b_rep_point_scaling_factor";

  bytes32 QUARTER_POINT_DRAFT_VOTE = "quarter_point_draft_vote";
  bytes32 QUARTER_POINT_VOTE = "quarter_point_vote";
  bytes32 QUARTER_POINT_INTERIM_VOTE = "quarter_point_interim_vote";
  bytes32 QUARTER_POINT_CLAIM_RESULT = "quarter_point_claim_result";
  bytes32 QUARTER_POINT_MILESTONE_COMPLETION = "q_p_milestone_completion";

  bytes32 REPUTATION_PER_EXTRA_QP = "reputation_per_extra_qp";
  bytes32 BONUS_REPUTATION_NUMERATOR = "bonus_reputation_numerator";
  bytes32 BONUS_REPUTATION_DENOMINATOR = "bonus_reputation_denominator";

  bytes32 SPECIAL_PROPOSAL_COMMIT_PHASE = "special_proposal_commit_phase";
  bytes32 SPECIAL_PROPOSAL_PHASE_TOTAL = "special_proposal_phase_total";

  bytes32 CONFIG_SPECIAL_QUOTA_NUMERATOR = "config_special_quota_numerator";
  bytes32 CONFIG_SPECIAL_QUOTA_DENOMINATOR = "config_special_quota_denominator";

  bytes32 CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR = "special_quorum_numerator";
  bytes32 CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR = "special_quorum_denominator";

  bytes32 CONFIG_MAXIMUM_REPUTATION_DEDUCTION = "config_max_reputation_deduction";
  bytes32 CONFIG_PUNISHMENT_FOR_NOT_LOCKING = "config_punishment_not_locking";

  bytes32 CONFIG_REPUTATION_PER_EXTRA_QP_NUM = "config_rep_per_extra_qp_num";
  bytes32 CONFIG_REPUTATION_PER_EXTRA_QP_DEN = "config_rep_per_extra_qp_den";

  bytes32 CONFIG_PORTION_TO_BADGE_HOLDERS_NUM = "config_bholder_portion_num";
  bytes32 CONFIG_PORTION_TO_BADGE_HOLDERS_DEN = "config_bholder_portion_den";
}
