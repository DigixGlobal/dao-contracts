pragma solidity ^0.4.24;


/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;


  event OwnershipRenounced(address indexed previousOwner);
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Allows the current owner to relinquish control of the contract.
   * @notice Renouncing to ownership will leave the contract without an owner.
   * It will not be possible to call the functions with the `onlyOwner`
   * modifier anymore.
   */
  function renounceOwnership() public onlyOwner {
    emit OwnershipRenounced(owner);
    owner = address(0);
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function transferOwnership(address _newOwner) public onlyOwner {
    _transferOwnership(_newOwner);
  }

  /**
   * @dev Transfers control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function _transferOwnership(address _newOwner) internal {
    require(_newOwner != address(0));
    emit OwnershipTransferred(owner, _newOwner);
    owner = _newOwner;
  }
}






/**
 * @title Claimable
 * @dev Extension for the Ownable contract, where the ownership needs to be claimed.
 * This allows the new owner to accept the transfer.
 */
contract Claimable is Ownable {
  address public pendingOwner;

  /**
   * @dev Modifier throws if called by any account other than the pendingOwner.
   */
  modifier onlyPendingOwner() {
    require(msg.sender == pendingOwner);
    _;
  }

  /**
   * @dev Allows the current owner to set the pendingOwner address.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) public onlyOwner {
    pendingOwner = newOwner;
  }

  /**
   * @dev Allows the pendingOwner address to finalize the transfer.
   */
  function claimOwnership() public onlyPendingOwner {
    emit OwnershipTransferred(owner, pendingOwner);
    owner = pendingOwner;
    pendingOwner = address(0);
  }
}


/// @title Owner based access control
/// @author DigixGlobal

contract ACOwned {

  address public owner;
  address public new_owner;
  bool is_ac_owned_init;

  /// @dev Modifier to check if msg.sender is the contract owner
  modifier if_owner() {
    require(is_owner());
    _;
  }

  function init_ac_owned()
           internal
           returns (bool _success)
  {
    if (is_ac_owned_init == false) {
      owner = msg.sender;
      is_ac_owned_init = true;
    }
    _success = true;
  }

  function is_owner()
           private
           constant
           returns (bool _is_owner)
  {
    _is_owner = (msg.sender == owner);
  }

  function change_owner(address _new_owner)
           if_owner()
           public
           returns (bool _success)
  {
    new_owner = _new_owner;
    _success = true;
  }

  function claim_ownership()
           public
           returns (bool _success)
  {
    require(msg.sender == new_owner);
    owner = new_owner;
    _success = true;
  }

}




/// @title Owner based access control
/// @author DigixGlobal

contract ACGroups is ACOwned {

  bool is_ac_groups_init = false;

  struct Group {
    mapping(address => bool) members;
  }

  mapping (bytes32 => Group) groups;

  modifier if_group(bytes32 _group_name) {
    require(groups[_group_name].members[msg.sender]);
    _;
  }

  function init_ac_groups()
           internal
           returns (bool _success)
  {
    if(is_ac_owned_init == false) {
      init_ac_owned();
    }
    if(is_ac_groups_init == false) {
      groups["admins"].members[msg.sender] = true;
      is_ac_groups_init = true;
    }
    _success = true;
  }

  function register_admin(address _newadmin)
           if_owner
           public
           returns (bool _success)
  {
    groups["admins"].members[_newadmin] = true;
    _success = true;
  }

  function unregister_admin(address _oldadmin)
           if_owner
           public
           returns (bool _success)
  {
    groups["admins"].members[_oldadmin] = false;
    _success = true;
  }

  function add_user_to_group(bytes32 _group, address _user)
           if_group("admins")
           public
           returns (bool _success)
  {
    require(_group != "admins");
    groups[_group].members[_user] = true;
    _success = true;
  }

  function delete_user_from_group(bytes32 _group, address _user)
           if_group("admins")
           public
           returns (bool _success)
  {
    require(_group != "admins");
    groups[_group].members[_user] = false;
    _success = true;
  }

  function is_group_member_of(bytes32 _group, address _user)
           public
           constant
           returns (bool _ismember)
  {
    _ismember = groups[_group].members[_user];
  }

  function claim_ownership()
           public
           returns (bool _success)
  {
    // revoke admins role of old owner, add new owner to admins
    groups["admins"].members[owner] = false;
    groups["admins"].members[new_owner] = true;
    _success = super.claim_ownership();
  }
}


/// @title Some useful constants
/// @author DigixGlobal

contract Constants {
  address constant NULL_ADDRESS = address(0x0);
  uint256 constant ZERO = uint256(0);
  bytes32 constant EMPTY = bytes32(0x0);
}





/// @title Contract Resolver Interface
/// @author DigixGlobal

contract ResolverClient {

  /// The address of the resolver contract for this project
  address public resolver;
  bytes32 public key;

  /// Make our own address available to us as a constant
  address public CONTRACT_ADDRESS;

  /// Function modifier to check if msg.sender corresponds to the resolved address of a given key
  /// @param _contract The resolver key
  modifier if_sender_is(bytes32 _contract) {
    require(sender_is(_contract));
    _;
  }

  function sender_is(bytes32 _contract) internal view returns (bool _isFrom) {
    _isFrom = msg.sender == ContractResolver(resolver).get_contract(_contract);
  }

  modifier if_sender_is_from(bytes32[3] _contracts) {
    require(sender_is_from(_contracts));
    _;
  }

  function sender_is_from(bytes32[3] _contracts) internal view returns (bool _isFrom) {
    uint256 _n = _contracts.length;
    for (uint256 i = 0; i < _n; i++) {
      if (_contracts[i] == bytes32(0x0)) continue;
      if (msg.sender == ContractResolver(resolver).get_contract(_contracts[i])) {
        _isFrom = true;
      }
    }
  }

  /// Function modifier to check resolver's locking status.
  modifier unless_resolver_is_locked() {
    require(is_locked() == false);
    _;
  }

  /// @dev Initialize new contract
  /// @param _key the resolver key for this contract
  /// @return _success if the initialization is successful
  function init(bytes32 _key, address _resolver)
           internal
           returns (bool _success)
  {
    bool _is_locked = ContractResolver(_resolver).locked();
    if (_is_locked == false) {
      CONTRACT_ADDRESS = address(this);
      resolver = _resolver;
      key = _key;
      require(ContractResolver(resolver).init_register_contract(key, CONTRACT_ADDRESS));
      _success = true;
    }  else {
      _success = false;
    }
  }

  /// @dev Destroy the contract and unregister self from the ContractResolver
  /// @dev Can only be called by the owner of ContractResolver
  /* function destroy()
           public
           returns (bool _success)
  {
    bool _is_locked = ContractResolver(resolver).locked();
    require(!_is_locked);

    address _owner_of_contract_resolver = ContractResolver(resolver).owner();
    require(msg.sender == _owner_of_contract_resolver);

    _success = ContractResolver(resolver).unregister_contract(key);
    require(_success);

    selfdestruct(_owner_of_contract_resolver);
  } */

  /// @dev Check if resolver is locked
  /// @return _locked if the resolver is currently locked
  function is_locked()
           private
           constant
           returns (bool _locked)
  {
    _locked = ContractResolver(resolver).locked();
  }

  /// @dev Get the address of a contract
  /// @param _key the resolver key to look up
  /// @return _contract the address of the contract
  function get_contract(bytes32 _key)
           public
           constant
           returns (address _contract)
  {
    _contract = ContractResolver(resolver).get_contract(_key);
  }
}





/// @title Contract Name Registry
/// @author DigixGlobal

contract ContractResolver is ACGroups, Constants {

  mapping (bytes32 => address) contracts;
  event RegisterEvent(bytes32 indexed _contract_name,
                      address indexed _contract_address);
  event UnRegisterEvent(bytes32 indexed _contract_name);
  bool public locked;
  bool public time_locked;
  uint public grace_period;

  modifier unless_registered(bytes32 _key) {
    require(contracts[_key] == NULL_ADDRESS);
    _;
  }

  modifier if_owner_origin() {
    require(tx.origin == owner);
    _;
  }

  /// Function modifier to check if msg.sender corresponds to the resolved address of a given key
  /// @param _contract The resolver key
  modifier if_sender_is(bytes32 _contract) {
    require(msg.sender == get_contract(_contract));
    _;
  }

  modifier locked_after_period() {
    if (time_locked == false) {
      _;
    } else {
      require(grace_period >= now);
      _;
    }
  }

  modifier if_not_locked() {
    require(locked == false);
    _;
  }

  /// @dev ContractResolver constructor will perform the following: 1. Set msg.sender as the contract owner.  2. Adds msg.sender to the default groups 'admins' and 'nsadmins'
  constructor() public
  {
    require(init_ac_groups());
    groups["nsadmins"].members[owner] = true;
    locked = false;
  }

  /// TODO: this function can basically do everything register_contract can do (except for emitting an event). Maybe we should require that this function can only be called by a contract?
  /// @dev Called at contract initialization
  /// @param _key bytestring for CACP name
  /// @param _contract_address The address of the contract to be registered
  /// @return _success if the operation is successful
  function init_register_contract(bytes32 _key, address _contract_address)
           if_owner_origin()
           if_not_locked()
           unless_registered(_key)
           locked_after_period()
           public
           returns (bool _success)
  {
    contracts[_key] = _contract_address;
    _success = true;
  }

  /// @dev Lock the resolver from any further modifications.  This can only be called from an account that is part of the nsadmins group
  /// @return _success if the operation is successful
  function lock_resolver()
           if_group("nsadmins")
           public
           returns (bool _success)
  {
    locked = true;
    _success = true;
  }

  /// @dev Unlock the resolver to allow further modifications.  This can only be called from an account that is part of the nsadmins group
  /// @return _success if the operation is successful
  function unlock_resolver()
           if_group("nsadmins")
           public
           returns (bool _success)
  {
     locked = false;
     _success = true;
  }

  /// @dev Enable time locking. This is potentially dangerous and must be from the owner
  /// @param _grace_period the unix timestamp when the resolver is locked forever
  function enable_time_locking(uint _grace_period)
           if_owner()
           locked_after_period()
           public
           returns (bool _success)
  {
    grace_period = _grace_period;
    time_locked = true;
    _success = true;
  }

  /// @dev Register a contract.  This can only be called from an account that is part of the nsadmins group
  /// @param _key the bytestring of the contract name
  /// @param _contract the address of the contract
  /// @return _success if the operation is successful
  function register_contract(bytes32 _key, address _contract)
           if_group("nsadmins")
           if_owner_origin()
           if_not_locked()
           locked_after_period()
           unless_registered(_key)
           public
           returns (bool _success)
  {
    contracts[_key] = _contract;
    emit RegisterEvent(_key, _contract);
    _success = true;
  }

  /// @dev Unregister a contract.  This can only be called from the contract with the key itself, which should be destroyed in the process
  /// this must also be originated from the owner of this ContractResolver as well.
  /// @param _key the bytestring of the contract name
  /// @return _success if the operation is successful
  /* function unregister_contract(bytes32 _key)
           locked_after_period()
           if_owner_origin()
           if_not_locked()
           if_sender_is(_key)
           public
           returns (bool _success)
  {
    delete contracts[_key];
    UnRegisterEvent(_key);
    _success = true;
  } */

  /// @dev Get address of a contract
  /// @param _key the bytestring name of the contract to look up
  /// @return _contract the address of the contract
  function get_contract(bytes32 _key)
           public
           constant
           returns (address _contract)
  {
    require(contracts[_key] != NULL_ADDRESS);
    _contract = contracts[_key];
  }

  function claim_ownership()
           public
           returns (bool _success)
  {
    // revoke nsadmins role of old owner, add new owner to nsadmins
    groups["nsadmins"].members[owner] = false;
    groups["nsadmins"].members[new_owner] = true;
    _success = super.claim_ownership();
  }
}

/**
  @title Address Iterator Interactive
  @author DigixGlobal Pte Ltd
*/
contract AddressIteratorInteractive {

  /**
    @notice Lists a Address collection from start or end
    @param _count Total number of Address items to return
    @param _function_first Function that returns the First Address item in the list
    @param _function_last Function that returns the last Address item in the list
    @param _function_next Function that returns the Next Address item in the list
    @param _function_previous Function that returns previous Address item in the list
    @param _from_start whether to read from start (or end) of the list
    @return {"_address_items" : "Collection of reversed Address list"}
  */
  function list_addresses(uint256 _count,
                                 function () external constant returns (address) _function_first,
                                 function () external constant returns (address) _function_last,
                                 function (address) external constant returns (address) _function_next,
                                 function (address) external constant returns (address) _function_previous,
                                 bool _from_start)
           internal
           constant
           returns (address[] _address_items)
  {
    if (_from_start) {
      _address_items = private_list_addresses_from_address(_function_first(), _count, true, _function_last, _function_next);
    } else {
      _address_items = private_list_addresses_from_address(_function_last(), _count, true, _function_first, _function_previous);
    }
  }



  /**
    @notice Lists a Address collection from some `_current_item`, going forwards or backwards depending on `_from_start`
    @param _current_item The current Item
    @param _count Total number of Address items to return
    @param _function_first Function that returns the First Address item in the list
    @param _function_last Function that returns the last Address item in the list
    @param _function_next Function that returns the Next Address item in the list
    @param _function_previous Function that returns previous Address item in the list
    @param _from_start whether to read in the forwards ( or backwards) direction
    @return {"_address_items" :"Collection/list of Address"}
  */
  function list_addresses_from(address _current_item, uint256 _count,
                                function () external constant returns (address) _function_first,
                                function () external constant returns (address) _function_last,
                                function (address) external constant returns (address) _function_next,
                                function (address) external constant returns (address) _function_previous,
                                bool _from_start)
           internal
           constant
           returns (address[] _address_items)
  {
    if (_from_start) {
      _address_items = private_list_addresses_from_address(_current_item, _count, false, _function_last, _function_next);
    } else {
      _address_items = private_list_addresses_from_address(_current_item, _count, false, _function_first, _function_previous);
    }
  }


  /**
    @notice a private function to lists a Address collection starting from some `_current_item` (which could be included or excluded), in the forwards or backwards direction
    @param _current_item The current Item
    @param _count Total number of Address items to return
    @param _including_current Whether the `_current_item` should be included in the result
    @param _function_last Function that returns the address where we stop reading more address
    @param _function_next Function that returns the next address to read after some address (could be backwards or forwards in the physical collection)
    @return {"_address_items" :"Collection/list of Address"}
  */
  function private_list_addresses_from_address(address _current_item, uint256 _count, bool _including_current,
                                 function () external constant returns (address) _function_last,
                                 function (address) external constant returns (address) _function_next)
           private
           constant
           returns (address[] _address_items)
  {
    uint256 _i;
    uint256 _real_count = 0;
    address _last_item;

    _last_item = _function_last();
    if (_count == 0 || _last_item == address(0x0)) {
      _address_items = new address[](0);
    } else {
      address[] memory _items_temp = new address[](_count);
      address _this_item;
      if (_including_current == true) {
        _items_temp[0] = _current_item;
        _real_count = 1;
      }
      _this_item = _current_item;
      for (_i = _real_count; (_i < _count) && (_this_item != _last_item);_i++) {
        _this_item = _function_next(_this_item);
        if (_this_item != address(0x0)) {
          _real_count++;
          _items_temp[_i] = _this_item;
        }
      }

      _address_items = new address[](_real_count);
      for(_i = 0;_i < _real_count;_i++) {
        _address_items[_i] = _items_temp[_i];
      }
    }
  }


  /** DEPRECATED
    @notice private function to list a Address collection starting from the start or end of the list
    @param _count Total number of Address item to return
    @param _function_total Function that returns the Total number of Address item in the list
    @param _function_first Function that returns the First Address item in the list
    @param _function_next Function that returns the Next Address item in the list
    @return {"_address_items" :"Collection/list of Address"}
  */
  /*function list_addresses_from_start_or_end(uint256 _count,
                                 function () external constant returns (uint256) _function_total,
                                 function () external constant returns (address) _function_first,
                                 function (address) external constant returns (address) _function_next)

           private
           constant
           returns (address[] _address_items)
  {
    uint256 _i;
    address _current_item;
    uint256 _real_count = _function_total();

    if (_count > _real_count) {
      _count = _real_count;
    }

    address[] memory _items_tmp = new address[](_count);

    if (_count > 0) {
      _current_item = _function_first();
      _items_tmp[0] = _current_item;

      for(_i = 1;_i <= (_count - 1);_i++) {
        _current_item = _function_next(_current_item);
        if (_current_item != address(0x0)) {
          _items_tmp[_i] = _current_item;
        }
      }
      _address_items = _items_tmp;
    } else {
      _address_items = new address[](0);
    }
  }*/

  /** DEPRECATED
    @notice a private function to lists a Address collection starting from some `_current_item`, could be forwards or backwards
    @param _current_item The current Item
    @param _count Total number of Address items to return
    @param _function_last Function that returns the bytes where we stop reading more bytes
    @param _function_next Function that returns the next bytes to read after some bytes (could be backwards or forwards in the physical collection)
    @return {"_address_items" :"Collection/list of Address"}
  */
  /*function list_addresses_from_byte(address _current_item, uint256 _count,
                                 function () external constant returns (address) _function_last,
                                 function (address) external constant returns (address) _function_next)
           private
           constant
           returns (address[] _address_items)
  {
    uint256 _i;
    uint256 _real_count = 0;

    if (_count == 0) {
      _address_items = new address[](0);
    } else {
      address[] memory _items_temp = new address[](_count);

      address _start_item;
      address _last_item;

      _last_item = _function_last();

      if (_last_item != _current_item) {
        _start_item = _function_next(_current_item);
        if (_start_item != address(0x0)) {
          _items_temp[0] = _start_item;
          _real_count = 1;
          for(_i = 1;(_i <= (_count - 1)) && (_start_item != _last_item);_i++) {
            _start_item = _function_next(_start_item);
            if (_start_item != address(0x0)) {
              _real_count++;
              _items_temp[_i] = _start_item;
            }
          }
          _address_items = new address[](_real_count);
          for(_i = 0;_i <= (_real_count - 1);_i++) {
            _address_items[_i] = _items_temp[_i];
          }
        } else {
          _address_items = new address[](0);
        }
      } else {
        _address_items = new address[](0);
      }
    }
  }*/

}

/**
  @title Bytes Iterator Interactive
  @author DigixGlobal Pte Ltd
*/
contract BytesIteratorInteractive {

  /**
    @notice Lists a Bytes collection from start or end
    @param _count Total number of Bytes items to return
    @param _function_first Function that returns the First Bytes item in the list
    @param _function_last Function that returns the last Bytes item in the list
    @param _function_next Function that returns the Next Bytes item in the list
    @param _function_previous Function that returns previous Bytes item in the list
    @param _from_start whether to read from start (or end) of the list
    @return {"_bytes_items" : "Collection of reversed Bytes list"}
  */
  function list_bytesarray(uint256 _count,
                                 function () external constant returns (bytes32) _function_first,
                                 function () external constant returns (bytes32) _function_last,
                                 function (bytes32) external constant returns (bytes32) _function_next,
                                 function (bytes32) external constant returns (bytes32) _function_previous,
                                 bool _from_start)
           internal
           constant
           returns (bytes32[] _bytes_items)
  {
    if (_from_start) {
      _bytes_items = private_list_bytes_from_bytes(_function_first(), _count, true, _function_last, _function_next);
    } else {
      _bytes_items = private_list_bytes_from_bytes(_function_last(), _count, true, _function_first, _function_previous);
    }
  }

  /**
    @notice Lists a Bytes collection from some `_current_item`, going forwards or backwards depending on `_from_start`
    @param _current_item The current Item
    @param _count Total number of Bytes items to return
    @param _function_first Function that returns the First Bytes item in the list
    @param _function_last Function that returns the last Bytes item in the list
    @param _function_next Function that returns the Next Bytes item in the list
    @param _function_previous Function that returns previous Bytes item in the list
    @param _from_start whether to read in the forwards ( or backwards) direction
    @return {"_bytes_items" :"Collection/list of Bytes"}
  */
  function list_bytesarray_from(bytes32 _current_item, uint256 _count,
                                function () external constant returns (bytes32) _function_first,
                                function () external constant returns (bytes32) _function_last,
                                function (bytes32) external constant returns (bytes32) _function_next,
                                function (bytes32) external constant returns (bytes32) _function_previous,
                                bool _from_start)
           internal
           constant
           returns (bytes32[] _bytes_items)
  {
    if (_from_start) {
      _bytes_items = private_list_bytes_from_bytes(_current_item, _count, false, _function_last, _function_next);
    } else {
      _bytes_items = private_list_bytes_from_bytes(_current_item, _count, false, _function_first, _function_previous);
    }
  }

  /**
    @notice A private function to lists a Bytes collection starting from some `_current_item` (which could be included or excluded), in the forwards or backwards direction
    @param _current_item The current Item
    @param _count Total number of Bytes items to return
    @param _including_current Whether the `_current_item` should be included in the result
    @param _function_last Function that returns the bytes where we stop reading more bytes
    @param _function_next Function that returns the next bytes to read after some bytes (could be backwards or forwards in the physical collection)
    @return {"_address_items" :"Collection/list of Bytes"}
  */
  function private_list_bytes_from_bytes(bytes32 _current_item, uint256 _count, bool _including_current,
                                 function () external constant returns (bytes32) _function_last,
                                 function (bytes32) external constant returns (bytes32) _function_next)
           private
           constant
           returns (bytes32[] _bytes32_items)
  {
    uint256 _i;
    uint256 _real_count = 0;
    bytes32 _last_item;

    _last_item = _function_last();
    if (_count == 0 || _last_item == bytes32(0x0)) {
      _bytes32_items = new bytes32[](0);
    } else {
      bytes32[] memory _items_temp = new bytes32[](_count);
      bytes32 _this_item;
      if (_including_current == true) {
        _items_temp[0] = _current_item;
        _real_count = 1;
      }
      _this_item = _current_item;
      for (_i = _real_count; (_i < _count) && (_this_item != _last_item);_i++) {
        _this_item = _function_next(_this_item);
        if (_this_item != bytes32(0x0)) {
          _real_count++;
          _items_temp[_i] = _this_item;
        }
      }

      _bytes32_items = new bytes32[](_real_count);
      for(_i = 0;_i < _real_count;_i++) {
        _bytes32_items[_i] = _items_temp[_i];
      }
    }
  }




  ////// DEPRECATED FUNCTIONS (old versions)

  /**
    @notice a private function to lists a Bytes collection starting from some `_current_item`, could be forwards or backwards
    @param _current_item The current Item
    @param _count Total number of Bytes items to return
    @param _function_last Function that returns the bytes where we stop reading more bytes
    @param _function_next Function that returns the next bytes to read after some bytes (could be backwards or forwards in the physical collection)
    @return {"_bytes_items" :"Collection/list of Bytes"}
  */
  /*function list_bytes_from_bytes(bytes32 _current_item, uint256 _count,
                                 function () external constant returns (bytes32) _function_last,
                                 function (bytes32) external constant returns (bytes32) _function_next)
           private
           constant
           returns (bytes32[] _bytes_items)
  {
    uint256 _i;
    uint256 _real_count = 0;

    if (_count == 0) {
      _bytes_items = new bytes32[](0);
    } else {
      bytes32[] memory _items_temp = new bytes32[](_count);

      bytes32 _start_item;
      bytes32 _last_item;

      _last_item = _function_last();

      if (_last_item != _current_item) {
        _start_item = _function_next(_current_item);
        if (_start_item != bytes32(0x0)) {
          _items_temp[0] = _start_item;
          _real_count = 1;
          for(_i = 1;(_i <= (_count - 1)) && (_start_item != _last_item);_i++) {
            _start_item = _function_next(_start_item);
            if (_start_item != bytes32(0x0)) {
              _real_count++;
              _items_temp[_i] = _start_item;
            }
          }
          _bytes_items = new bytes32[](_real_count);
          for(_i = 0;_i <= (_real_count - 1);_i++) {
            _bytes_items[_i] = _items_temp[_i];
          }
        } else {
          _bytes_items = new bytes32[](0);
        }
      } else {
        _bytes_items = new bytes32[](0);
      }
    }
  }*/

  /**
    @notice private function to list a Bytes collection starting from the start or end of the list
    @param _count Total number of Bytes item to return
    @param _function_total Function that returns the Total number of Bytes item in the list
    @param _function_first Function that returns the First Bytes item in the list
    @param _function_next Function that returns the Next Bytes item in the list
    @return {"_bytes_items" :"Collection/list of Bytes"}
  */
  /*function list_bytes_from_start_or_end(uint256 _count,
                                 function () external constant returns (uint256) _function_total,
                                 function () external constant returns (bytes32) _function_first,
                                 function (bytes32) external constant returns (bytes32) _function_next)

           private
           constant
           returns (bytes32[] _bytes_items)
  {
    uint256 _i;
    bytes32 _current_item;
    uint256 _real_count = _function_total();

    if (_count > _real_count) {
      _count = _real_count;
    }

    bytes32[] memory _items_tmp = new bytes32[](_count);

    if (_count > 0) {
      _current_item = _function_first();
      _items_tmp[0] = _current_item;

      for(_i = 1;_i <= (_count - 1);_i++) {
        _current_item = _function_next(_current_item);
        if (_current_item != bytes32(0x0)) {
          _items_tmp[_i] = _current_item;
        }
      }
      _bytes_items = _items_tmp;
    } else {
      _bytes_items = new bytes32[](0);
    }
  }*/
}


/**
  @title Indexed Bytes Iterator Interactive
  @author DigixGlobal Pte Ltd
*/
contract IndexedBytesIteratorInteractive {

  /**
    @notice Lists an indexed Bytes collection from start or end
    @param _collection_index Index of the Collection to list
    @param _count Total number of Bytes items to return
    @param _function_first Function that returns the First Bytes item in the list
    @param _function_last Function that returns the last Bytes item in the list
    @param _function_next Function that returns the Next Bytes item in the list
    @param _function_previous Function that returns previous Bytes item in the list
    @param _from_start whether to read from start (or end) of the list
    @return {"_bytes_items" : "Collection of reversed Bytes list"}
  */
  function list_indexed_bytesarray(bytes32 _collection_index, uint256 _count,
                              function (bytes32) external constant returns (bytes32) _function_first,
                              function (bytes32) external constant returns (bytes32) _function_last,
                              function (bytes32, bytes32) external constant returns (bytes32) _function_next,
                              function (bytes32, bytes32) external constant returns (bytes32) _function_previous,
                              bool _from_start)
           internal
           constant
           returns (bytes32[] _indexed_bytes_items)
  {
    if (_from_start) {
      _indexed_bytes_items = private_list_indexed_bytes_from_bytes(_collection_index, _function_first(_collection_index), _count, true, _function_last, _function_next);
    } else {
      _indexed_bytes_items = private_list_indexed_bytes_from_bytes(_collection_index, _function_last(_collection_index), _count, true, _function_first, _function_previous);
    }
  }

  /**
    @notice Lists an indexed Bytes collection from some `_current_item`, going forwards or backwards depending on `_from_start`
    @param _collection_index Index of the Collection to list
    @param _current_item The current Item
    @param _count Total number of Bytes items to return
    @param _function_first Function that returns the First Bytes item in the list
    @param _function_last Function that returns the last Bytes item in the list
    @param _function_next Function that returns the Next Bytes item in the list
    @param _function_previous Function that returns previous Bytes item in the list
    @param _from_start whether to read in the forwards ( or backwards) direction
    @return {"_bytes_items" :"Collection/list of Bytes"}
  */
  function list_indexed_bytesarray_from(bytes32 _collection_index, bytes32 _current_item, uint256 _count,
                                function (bytes32) external constant returns (bytes32) _function_first,
                                function (bytes32) external constant returns (bytes32) _function_last,
                                function (bytes32, bytes32) external constant returns (bytes32) _function_next,
                                function (bytes32, bytes32) external constant returns (bytes32) _function_previous,
                                bool _from_start)
           internal
           constant
           returns (bytes32[] _indexed_bytes_items)
  {
    if (_from_start) {
      _indexed_bytes_items = private_list_indexed_bytes_from_bytes(_collection_index, _current_item, _count, false, _function_last, _function_next);
    } else {
      _indexed_bytes_items = private_list_indexed_bytes_from_bytes(_collection_index, _current_item, _count, false, _function_first, _function_previous);
    }
  }

  /**
    @notice a private function to lists an indexed Bytes collection starting from some `_current_item` (which could be included or excluded), in the forwards or backwards direction
    @param _collection_index Index of the Collection to list
    @param _current_item The item where we start reading from the list
    @param _count Total number of Bytes items to return
    @param _including_current Whether the `_current_item` should be included in the result
    @param _function_last Function that returns the bytes where we stop reading more bytes
    @param _function_next Function that returns the next bytes to read after another bytes (could be backwards or forwards in the physical collection)
    @return {"_bytes_items" :"Collection/list of Bytes"}
  */
  function private_list_indexed_bytes_from_bytes(bytes32 _collection_index, bytes32 _current_item, uint256 _count, bool _including_current,
                                         function (bytes32) external constant returns (bytes32) _function_last,
                                         function (bytes32, bytes32) external constant returns (bytes32) _function_next)
           private
           constant
           returns (bytes32[] _indexed_bytes_items)
  {
    uint256 _i;
    uint256 _real_count = 0;
    bytes32 _last_item;

    _last_item = _function_last(_collection_index);
    if (_count == 0 || _last_item == bytes32(0x0)) {  // if count is 0 or the collection is empty, returns empty array
      _indexed_bytes_items = new bytes32[](0);
    } else {
      bytes32[] memory _items_temp = new bytes32[](_count);
      bytes32 _this_item;
      if (_including_current) {
        _items_temp[0] = _current_item;
        _real_count = 1;
      }
      _this_item = _current_item;
      for (_i = _real_count; (_i < _count) && (_this_item != _last_item);_i++) {
        _this_item = _function_next(_collection_index, _this_item);
        if (_this_item != bytes32(0x0)) {
          _real_count++;
          _items_temp[_i] = _this_item;
        }
      }

      _indexed_bytes_items = new bytes32[](_real_count);
      for(_i = 0;_i < _real_count;_i++) {
        _indexed_bytes_items[_i] = _items_temp[_i];
      }
    }
  }


  // old function, DEPRECATED
  /*function list_indexed_bytes_from_bytes(bytes32 _collection_index, bytes32 _current_item, uint256 _count,
                                         function (bytes32) external constant returns (bytes32) _function_last,
                                         function (bytes32, bytes32) external constant returns (bytes32) _function_next)
           private
           constant
           returns (bytes32[] _indexed_bytes_items)
  {
    uint256 _i;
    uint256 _real_count = 0;
    if (_count == 0) {
      _indexed_bytes_items = new bytes32[](0);
    } else {
      bytes32[] memory _items_temp = new bytes32[](_count);

      bytes32 _start_item;
      bytes32 _last_item;

      _last_item = _function_last(_collection_index);

      if (_last_item != _current_item) {
        _start_item = _function_next(_collection_index, _current_item);
        if (_start_item != bytes32(0x0)) {
          _items_temp[0] = _start_item;
          _real_count = 1;
          for(_i = 1;(_i <= (_count - 1)) && (_start_item != _last_item);_i++) {
            _start_item = _function_next(_collection_index, _start_item);
            if (_start_item != bytes32(0x0)) {
              _real_count++;
              _items_temp[_i] = _start_item;
            }
          }
          _indexed_bytes_items = new bytes32[](_real_count);
          for(_i = 0;_i <= (_real_count - 1);_i++) {
            _indexed_bytes_items[_i] = _items_temp[_i];
          }
        } else {
          _indexed_bytes_items = new bytes32[](0);
        }
      } else {
        _indexed_bytes_items = new bytes32[](0);
      }
    }
  }*/


}


library DoublyLinkedList {

  struct Item {
    bytes32 item;
    uint256 previous_index;
    uint256 next_index;
  }

  struct Data {
    uint256 first_index;
    uint256 last_index;
    uint256 count;
    mapping(bytes32 => uint256) item_index;
    mapping(uint256 => bool) valid_indexes;
    Item[] collection;
  }

  struct IndexedUint {
    mapping(bytes32 => Data) data;
  }

  struct IndexedAddress {
    mapping(bytes32 => Data) data;
  }

  struct IndexedBytes {
    mapping(bytes32 => Data) data;
  }

  struct Address {
    Data data;
  }

  struct Bytes {
    Data data;
  }

  struct Uint {
    Data data;
  }

  uint256 constant NONE = uint256(0);
  bytes32 constant EMPTY_BYTES = bytes32(0x0);
  address constant NULL_ADDRESS = address(0x0);

  function find(Data storage self, bytes32 _item)
           public
           constant
           returns (uint256 _item_index)
  {
    if ((self.item_index[_item] == NONE) && (self.count == NONE)) {
      _item_index = NONE;
    } else {
      _item_index = self.item_index[_item];
    }
  }

  function get(Data storage self, uint256 _item_index)
           public
           constant
           returns (bytes32 _item)
  {
    if (self.valid_indexes[_item_index] == true) {
      _item = self.collection[_item_index - 1].item;
    } else {
      _item = EMPTY_BYTES;
    }
  }

  function append(Data storage self, bytes32 _data)
           internal
           returns (bool _success)
  {
    if (find(self, _data) != NONE || _data == bytes32("")) { // rejects addition of empty values
      _success = false;
    } else {
      uint256 _index = uint256(self.collection.push(Item({item: _data, previous_index: self.last_index, next_index: NONE})));
      if (self.last_index == NONE) {
        if ((self.first_index != NONE) || (self.count != NONE)) {
          revert();
        } else {
          self.first_index = self.last_index = _index;
          self.count = 1;
        }
      } else {
        self.collection[self.last_index - 1].next_index = _index;
        self.last_index = _index;
        self.count++;
      }
      self.valid_indexes[_index] = true;
      self.item_index[_data] = _index;
      _success = true;
    }
  }

  function remove(Data storage self, uint256 _index)
           internal
           returns (bool _success)
  {
    if (self.valid_indexes[_index] == true) {
      Item memory item = self.collection[_index - 1];
      if (item.previous_index == NONE) {
        self.first_index = item.next_index;
      } else {
        self.collection[item.previous_index - 1].next_index = item.next_index;
      }

      if (item.next_index == NONE) {
        self.last_index = item.previous_index;
      } else {
        self.collection[item.next_index - 1].previous_index = item.previous_index;
      }
      delete self.collection[_index - 1];
      self.valid_indexes[_index] = false;
      delete self.item_index[item.item];
      self.count--;
      _success = true;
    } else {
      _success = false;
    }
  }

  function remove_item(Data storage self, bytes32 _item)
           internal
           returns (bool _success)
  {
    uint256 _item_index = find(self, _item);
    if (_item_index != NONE) {
      require(remove(self, _item_index));
      _success = true;
    } else {
      _success = false;
    }
    return _success;
  }

  function total(Data storage self)
           public
           constant
           returns (uint256 _total_count)
  {
    _total_count = self.count;
  }

  function start(Data storage self)
           public
           constant
           returns (uint256 _item_index)
  {
    _item_index = self.first_index;
    return _item_index;
  }

  function start_item(Data storage self)
           public
           constant
           returns (bytes32 _item)
  {
    uint256 _item_index = start(self);
    if (_item_index != NONE) {
      _item = get(self, _item_index);
    } else {
      _item = EMPTY_BYTES;
    }
  }

  function end(Data storage self)
           public
           constant
           returns (uint256 _item_index)
  {
    _item_index = self.last_index;
    return _item_index;
  }

  function end_item(Data storage self)
           public
           constant
           returns (bytes32 _item)
  {
    uint256 _item_index = end(self);
    if (_item_index != NONE) {
      _item = get(self, _item_index);
    } else {
      _item = EMPTY_BYTES;
    }
  }

  function valid(Data storage self, uint256 _item_index)
           public
           constant
           returns (bool _yes)
  {
    _yes = self.valid_indexes[_item_index];
    //_yes = ((_item_index - 1) < self.collection.length);
  }

  function valid_item(Data storage self, bytes32 _item)
           public
           constant
           returns (bool _yes)
  {
    uint256 _item_index = self.item_index[_item];
    _yes = self.valid_indexes[_item_index];
  }

  function previous(Data storage self, uint256 _current_index)
           public
           constant
           returns (uint256 _previous_index)
  {
    if (self.valid_indexes[_current_index] == true) {
      _previous_index = self.collection[_current_index - 1].previous_index;
    } else {
      _previous_index = NONE;
    }
  }

  function previous_item(Data storage self, bytes32 _current_item)
           public
           constant
           returns (bytes32 _previous_item)
  {
    uint256 _current_index = find(self, _current_item);
    if (_current_index != NONE) {
      uint256 _previous_index = previous(self, _current_index);
      _previous_item = get(self, _previous_index);
    } else {
      _previous_item = EMPTY_BYTES;
    }
  }

  function next(Data storage self, uint256 _current_index)
           public
           constant
           returns (uint256 _next_index)
  {
    if (self.valid_indexes[_current_index] == true) {
      _next_index = self.collection[_current_index - 1].next_index;
    } else {
      _next_index = NONE;
    }
  }

  function next_item(Data storage self, bytes32 _current_item)
           public
           constant
           returns (bytes32 _next_item)
  {
    uint256 _current_index = find(self, _current_item);
    if (_current_index != NONE) {
      uint256 _next_index = next(self, _current_index);
      _next_item = get(self, _next_index);
    } else {
      _next_item = EMPTY_BYTES;
    }
  }

  function find(Uint storage self, uint256 _item)
           public
           constant
           returns (uint256 _item_index)
  {
    _item_index = find(self.data, bytes32(_item));
  }

  function get(Uint storage self, uint256 _item_index)
           public
           constant
           returns (uint256 _item)
  {
    _item = uint256(get(self.data, _item_index));
  }


  function append(Uint storage self, uint256 _data)
           public
           returns (bool _success)
  {
    _success = append(self.data, bytes32(_data));
  }

  function remove(Uint storage self, uint256 _index)
           internal
           returns (bool _success)
  {
    _success = remove(self.data, _index);
  }

  function remove_item(Uint storage self, uint256 _item)
           public
           returns (bool _success)
  {
    _success = remove_item(self.data, bytes32(_item));
  }

  function total(Uint storage self)
           public
           constant
           returns (uint256 _total_count)
  {
    _total_count = total(self.data);
  }

  function start(Uint storage self)
           public
           constant
           returns (uint256 _index)
  {
    _index = start(self.data);
  }

  function start_item(Uint storage self)
           public
           constant
           returns (uint256 _start_item)
  {
    _start_item = uint256(start_item(self.data));
  }


  function end(Uint storage self)
           public
           constant
           returns (uint256 _index)
  {
    _index = end(self.data);
  }

  function end_item(Uint storage self)
           public
           constant
           returns (uint256 _end_item)
  {
    _end_item = uint256(end_item(self.data));
  }

  function valid(Uint storage self, uint256 _item_index)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid(self.data, _item_index);
  }

  function valid_item(Uint storage self, uint256 _item)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid_item(self.data, bytes32(_item));
  }

  function previous(Uint storage self, uint256 _current_index)
           public
           constant
           returns (uint256 _previous_index)
  {
    _previous_index = previous(self.data, _current_index);
  }

  function previous_item(Uint storage self, uint256 _current_item)
           public
           constant
           returns (uint256 _previous_item)
  {
    _previous_item = uint256(previous_item(self.data, bytes32(_current_item)));
  }

  function next(Uint storage self, uint256 _current_index)
           public
           constant
           returns (uint256 _next_index)
  {
    _next_index = next(self.data, _current_index);
  }

  function next_item(Uint storage self, uint256 _current_item)
           public
           constant
           returns (uint256 _next_item)
  {
    _next_item = uint256(next_item(self.data, bytes32(_current_item)));
  }

  function find(Address storage self, address _item)
           public
           constant
           returns (uint256 _item_index)
  {
    _item_index = find(self.data, bytes32(_item));
  }

  function get(Address storage self, uint256 _item_index)
           public
           constant
           returns (address _item)
  {
    _item = address(get(self.data, _item_index));
  }


  function find(IndexedUint storage self, bytes32 _collection_index, uint256 _item)
           public
           constant
           returns (uint256 _item_index)
  {
    _item_index = find(self.data[_collection_index], bytes32(_item));
  }

  function get(IndexedUint storage self, bytes32 _collection_index, uint256 _item_index)
           public
           constant
           returns (uint256 _item)
  {
    _item = uint256(get(self.data[_collection_index], _item_index));
  }


  function append(IndexedUint storage self, bytes32 _collection_index, uint256 _data)
           public
           returns (bool _success)
  {
    _success = append(self.data[_collection_index], bytes32(_data));
  }

  function remove(IndexedUint storage self, bytes32 _collection_index, uint256 _index)
           internal
           returns (bool _success)
  {
    _success = remove(self.data[_collection_index], _index);
  }

  function remove_item(IndexedUint storage self, bytes32 _collection_index, uint256 _item)
           public
           returns (bool _success)
  {
    _success = remove_item(self.data[_collection_index], bytes32(_item));
  }

  function total(IndexedUint storage self, bytes32 _collection_index)
           public
           constant
           returns (uint256 _total_count)
  {
    _total_count = total(self.data[_collection_index]);
  }

  function start(IndexedUint storage self, bytes32 _collection_index)
           public
           constant
           returns (uint256 _index)
  {
    _index = start(self.data[_collection_index]);
  }

  function start_item(IndexedUint storage self, bytes32 _collection_index)
           public
           constant
           returns (uint256 _start_item)
  {
    _start_item = uint256(start_item(self.data[_collection_index]));
  }


  function end(IndexedUint storage self, bytes32 _collection_index)
           public
           constant
           returns (uint256 _index)
  {
    _index = end(self.data[_collection_index]);
  }

  function end_item(IndexedUint storage self, bytes32 _collection_index)
           public
           constant
           returns (uint256 _end_item)
  {
    _end_item = uint256(end_item(self.data[_collection_index]));
  }

  function valid(IndexedUint storage self, bytes32 _collection_index, uint256 _item_index)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid(self.data[_collection_index], _item_index);
  }

  function valid_item(IndexedUint storage self, bytes32 _collection_index, uint256 _item)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid_item(self.data[_collection_index], bytes32(_item));
  }

  function previous(IndexedUint storage self, bytes32 _collection_index, uint256 _current_index)
           public
           constant
           returns (uint256 _previous_index)
  {
    _previous_index = previous(self.data[_collection_index], _current_index);
  }

  function previous_item(IndexedUint storage self, bytes32 _collection_index, uint256 _current_item)
           public
           constant
           returns (uint256 _previous_item)
  {
    _previous_item = uint256(previous_item(self.data[_collection_index], bytes32(_current_item)));
  }

  function next(IndexedUint storage self, bytes32 _collection_index, uint256 _current_index)
           public
           constant
           returns (uint256 _next_index)
  {
    _next_index = next(self.data[_collection_index], _current_index);
  }

  function next_item(IndexedUint storage self, bytes32 _collection_index, uint256 _current_item)
           public
           constant
           returns (uint256 _next_item)
  {
    _next_item = uint256(next_item(self.data[_collection_index], bytes32(_current_item)));
  }

  function append(Address storage self, address _data)
           public
           returns (bool _success)
  {
    _success = append(self.data, bytes32(_data));
  }

  function remove(Address storage self, uint256 _index)
           internal
           returns (bool _success)
  {
    _success = remove(self.data, _index);
  }


  function remove_item(Address storage self, address _item)
           public
           returns (bool _success)
  {
    _success = remove_item(self.data, bytes32(_item));
  }

  function total(Address storage self)
           public
           constant
           returns (uint256 _total_count)
  {
    _total_count = total(self.data);
  }

  function start(Address storage self)
           public
           constant
           returns (uint256 _index)
  {
    _index = start(self.data);
  }

  function start_item(Address storage self)
           public
           constant
           returns (address _start_item)
  {
    _start_item = address(start_item(self.data));
  }


  function end(Address storage self)
           public
           constant
           returns (uint256 _index)
  {
    _index = end(self.data);
  }

  function end_item(Address storage self)
           public
           constant
           returns (address _end_item)
  {
    _end_item = address(end_item(self.data));
  }

  function valid(Address storage self, uint256 _item_index)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid(self.data, _item_index);
  }

  function valid_item(Address storage self, address _item)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid_item(self.data, bytes32(_item));
  }

  function previous(Address storage self, uint256 _current_index)
           public
           constant
           returns (uint256 _previous_index)
  {
    _previous_index = previous(self.data, _current_index);
  }

  function previous_item(Address storage self, address _current_item)
           public
           constant
           returns (address _previous_item)
  {
    _previous_item = address(previous_item(self.data, bytes32(_current_item)));
  }

  function next(Address storage self, uint256 _current_index)
           public
           constant
           returns (uint256 _next_index)
  {
    _next_index = next(self.data, _current_index);
  }

  function next_item(Address storage self, address _current_item)
           public
           constant
           returns (address _next_item)
  {
    _next_item = address(next_item(self.data, bytes32(_current_item)));
  }

  function append(IndexedAddress storage self, bytes32 _collection_index, address _data)
           public
           returns (bool _success)
  {
    _success = append(self.data[_collection_index], bytes32(_data));
  }

  function remove(IndexedAddress storage self, bytes32 _collection_index, uint256 _index)
           internal
           returns (bool _success)
  {
    _success = remove(self.data[_collection_index], _index);
  }


  function remove_item(IndexedAddress storage self, bytes32 _collection_index, address _item)
           public
           returns (bool _success)
  {
    _success = remove_item(self.data[_collection_index], bytes32(_item));
  }

  function total(IndexedAddress storage self, bytes32 _collection_index)
           public
           constant
           returns (uint256 _total_count)
  {
    _total_count = total(self.data[_collection_index]);
  }

  function start(IndexedAddress storage self, bytes32 _collection_index)
           public
           constant
           returns (uint256 _index)
  {
    _index = start(self.data[_collection_index]);
  }

  function start_item(IndexedAddress storage self, bytes32 _collection_index)
           public
           constant
           returns (address _start_item)
  {
    _start_item = address(start_item(self.data[_collection_index]));
  }


  function end(IndexedAddress storage self, bytes32 _collection_index)
           public
           constant
           returns (uint256 _index)
  {
    _index = end(self.data[_collection_index]);
  }

  function end_item(IndexedAddress storage self, bytes32 _collection_index)
           public
           constant
           returns (address _end_item)
  {
    _end_item = address(end_item(self.data[_collection_index]));
  }

  function valid(IndexedAddress storage self, bytes32 _collection_index, uint256 _item_index)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid(self.data[_collection_index], _item_index);
  }

  function valid_item(IndexedAddress storage self, bytes32 _collection_index, address _item)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid_item(self.data[_collection_index], bytes32(_item));
  }

  function previous(IndexedAddress storage self, bytes32 _collection_index, uint256 _current_index)
           public
           constant
           returns (uint256 _previous_index)
  {
    _previous_index = previous(self.data[_collection_index], _current_index);
  }

  function previous_item(IndexedAddress storage self, bytes32 _collection_index, address _current_item)
           public
           constant
           returns (address _previous_item)
  {
    _previous_item = address(previous_item(self.data[_collection_index], bytes32(_current_item)));
  }

  function next(IndexedAddress storage self, bytes32 _collection_index, uint256 _current_index)
           public
           constant
           returns (uint256 _next_index)
  {
    _next_index = next(self.data[_collection_index], _current_index);
  }

  function next_item(IndexedAddress storage self, bytes32 _collection_index, address _current_item)
           public
           constant
           returns (address _next_item)
  {
    _next_item = address(next_item(self.data[_collection_index], bytes32(_current_item)));
  }


  function find(Bytes storage self, bytes32 _item)
           public
           constant
           returns (uint256 _item_index)
  {
    _item_index = find(self.data, _item);
  }

  function get(Bytes storage self, uint256 _item_index)
           public
           constant
           returns (bytes32 _item)
  {
    _item = get(self.data, _item_index);
  }


  function append(Bytes storage self, bytes32 _data)
           public
           returns (bool _success)
  {
    _success = append(self.data, _data);
  }

  function remove(Bytes storage self, uint256 _index)
           internal
           returns (bool _success)
  {
    _success = remove(self.data, _index);
  }


  function remove_item(Bytes storage self, bytes32 _item)
           public
           returns (bool _success)
  {
    _success = remove_item(self.data, _item);
  }

  function total(Bytes storage self)
           public
           constant
           returns (uint256 _total_count)
  {
    _total_count = total(self.data);
  }

  function start(Bytes storage self)
           public
           constant
           returns (uint256 _index)
  {
    _index = start(self.data);
  }

  function start_item(Bytes storage self)
           public
           constant
           returns (bytes32 _start_item)
  {
    _start_item = start_item(self.data);
  }


  function end(Bytes storage self)
           public
           constant
           returns (uint256 _index)
  {
    _index = end(self.data);
  }

  function end_item(Bytes storage self)
           public
           constant
           returns (bytes32 _end_item)
  {
    _end_item = end_item(self.data);
  }

  function valid(Bytes storage self, uint256 _item_index)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid(self.data, _item_index);
  }

  function valid_item(Bytes storage self, bytes32 _item)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid_item(self.data, _item);
  }

  function previous(Bytes storage self, uint256 _current_index)
           public
           constant
           returns (uint256 _previous_index)
  {
    _previous_index = previous(self.data, _current_index);
  }

  function previous_item(Bytes storage self, bytes32 _current_item)
           public
           constant
           returns (bytes32 _previous_item)
  {
    _previous_item = previous_item(self.data, _current_item);
  }

  function next(Bytes storage self, uint256 _current_index)
           public
           constant
           returns (uint256 _next_index)
  {
    _next_index = next(self.data, _current_index);
  }

  function next_item(Bytes storage self, bytes32 _current_item)
           public
           constant
           returns (bytes32 _next_item)
  {
    _next_item = next_item(self.data, _current_item);
  }

  function append(IndexedBytes storage self, bytes32 _collection_index, bytes32 _data)
           public
           returns (bool _success)
  {
    _success = append(self.data[_collection_index], bytes32(_data));
  }

  function remove(IndexedBytes storage self, bytes32 _collection_index, uint256 _index)
           internal
           returns (bool _success)
  {
    _success = remove(self.data[_collection_index], _index);
  }


  function remove_item(IndexedBytes storage self, bytes32 _collection_index, bytes32 _item)
           public
           returns (bool _success)
  {
    _success = remove_item(self.data[_collection_index], bytes32(_item));
  }

  function total(IndexedBytes storage self, bytes32 _collection_index)
           public
           constant
           returns (uint256 _total_count)
  {
    _total_count = total(self.data[_collection_index]);
  }

  function start(IndexedBytes storage self, bytes32 _collection_index)
           public
           constant
           returns (uint256 _index)
  {
    _index = start(self.data[_collection_index]);
  }

  function start_item(IndexedBytes storage self, bytes32 _collection_index)
           public
           constant
           returns (bytes32 _start_item)
  {
    _start_item = bytes32(start_item(self.data[_collection_index]));
  }


  function end(IndexedBytes storage self, bytes32 _collection_index)
           public
           constant
           returns (uint256 _index)
  {
    _index = end(self.data[_collection_index]);
  }

  function end_item(IndexedBytes storage self, bytes32 _collection_index)
           public
           constant
           returns (bytes32 _end_item)
  {
    _end_item = bytes32(end_item(self.data[_collection_index]));
  }

  function valid(IndexedBytes storage self, bytes32 _collection_index, uint256 _item_index)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid(self.data[_collection_index], _item_index);
  }

  function valid_item(IndexedBytes storage self, bytes32 _collection_index, bytes32 _item)
           public
           constant
           returns (bool _yes)
  {
    _yes = valid_item(self.data[_collection_index], bytes32(_item));
  }

  function previous(IndexedBytes storage self, bytes32 _collection_index, uint256 _current_index)
           public
           constant
           returns (uint256 _previous_index)
  {
    _previous_index = previous(self.data[_collection_index], _current_index);
  }

  function previous_item(IndexedBytes storage self, bytes32 _collection_index, bytes32 _current_item)
           public
           constant
           returns (bytes32 _previous_item)
  {
    _previous_item = bytes32(previous_item(self.data[_collection_index], bytes32(_current_item)));
  }

  function next(IndexedBytes storage self, bytes32 _collection_index, uint256 _current_index)
           public
           constant
           returns (uint256 _next_index)
  {
    _next_index = next(self.data[_collection_index], _current_index);
  }

  function next_item(IndexedBytes storage self, bytes32 _collection_index, bytes32 _current_item)
           public
           constant
           returns (bytes32 _next_item)
  {
    _next_item = bytes32(next_item(self.data[_collection_index], bytes32(_current_item)));
  }


}





/**
  @title Bytes Iterator Storage
  @author DigixGlobal Pte Ltd
*/
contract BytesIteratorStorage {

  // Initialize Doubly Linked List of Bytes
  using DoublyLinkedList for DoublyLinkedList.Bytes;

  /**
    @notice Reads the first item from the list of Bytes
    @param _list The source list
    @return {"_item": "The first item from the list"}
  */
  function read_first_from_bytesarray(DoublyLinkedList.Bytes storage _list)
           internal
           constant
           returns (bytes32 _item)
  {
    _item = _list.start_item();
  }

  /**
    @notice Reads the last item from the list of Bytes
    @param _list The source list
    @return {"_item": "The last item from the list"}
  */
  function read_last_from_bytesarray(DoublyLinkedList.Bytes storage _list)
           internal
           constant
           returns (bytes32 _item)
  {
    _item = _list.end_item();
  }

  /**
    @notice Reads the next item on the list of Bytes
    @param _list The source list
    @param _current_item The current item to be used as base line
    @return {"_item": "The next item from the list based on the specieid `_current_item`"}
    TODO: Need to verify what happens if the specified `_current_item` is the last item from the list
  */
  function read_next_from_bytesarray(DoublyLinkedList.Bytes storage _list, bytes32 _current_item)
           internal
           constant
           returns (bytes32 _item)
  {
    _item = _list.next_item(_current_item);
  }

  /**
    @notice Reads the previous item on the list of Bytes
    @param _list The source list
    @param _current_item The current item to be used as base line
    @return {"_item": "The previous item from the list based on the spcified `_current_item`"}
    TODO: Need to verify what happens if the specified `_current_item` is the first item from the list
  */
  function read_previous_from_bytesarray(DoublyLinkedList.Bytes storage _list, bytes32 _current_item)
           internal
           constant
           returns (bytes32 _item)
  {
    _item = _list.previous_item(_current_item);
  }

  /**
    @notice Reads the list of Bytes and returns the length of the list
    @param _list The source list
    @return {"count": "`uint256` The lenght of the list"}

  */
  function read_total_bytesarray(DoublyLinkedList.Bytes storage _list)
           internal
           constant
           returns (uint256 _count)
  {
    _count = _list.total();
  }

}



/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {

  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 _a, uint256 _b) internal pure returns (uint256 c) {
    // Gas optimization: this is cheaper than asserting 'a' not being zero, but the
    // benefit is lost if 'b' is also tested.
    // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
    if (_a == 0) {
      return 0;
    }

    c = _a * _b;
    assert(c / _a == _b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 _a, uint256 _b) internal pure returns (uint256) {
    // assert(_b > 0); // Solidity automatically throws when dividing by 0
    // uint256 c = _a / _b;
    // assert(_a == _b * c + _a % _b); // There is no case in which this doesn't hold
    return _a / _b;
  }

  /**
  * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 _a, uint256 _b) internal pure returns (uint256) {
    assert(_b <= _a);
    return _a - _b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 _a, uint256 _b) internal pure returns (uint256 c) {
    c = _a + _b;
    assert(c >= _a);
    return c;
  }
}




//done
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

    // interactive contracts
    bytes32 CONTRACT_DAO = "dao";
    bytes32 CONTRACT_DAO_STAKE_LOCKING = "dao:stake-locking";
    bytes32 CONTRACT_DAO_VOTING = "dao:voting";
    bytes32 CONTRACT_DAO_VOTING_CLAIMS = "dao:voting:claims";
    bytes32 CONTRACT_DAO_SPECIAL_VOTING_CLAIMS = "dao:svoting:claims";
    bytes32 CONTRACT_DAO_IDENTITY = "dao:identity";
    bytes32 CONTRACT_DAO_REWARDS_MANAGER = "dao:rewards-manager";
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
    bytes32 CONTRACT_STORAGE_DAO_FUNDING = "storage:dao:funding";
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





contract DaoWhitelistingStorage is ResolverClient, DaoConstants {

    mapping (address => bool) public whitelist;

    constructor(address _resolver)
        public
    {
        require(init(CONTRACT_STORAGE_DAO_WHITELISTING, _resolver));
    }

    function setWhitelisted(address _contractAddress, bool _isWhitelisted)
        public
    {
        require(sender_is(CONTRACT_DAO_WHITELISTING));
        whitelist[_contractAddress] = _isWhitelisted;
    }
}






//done
contract DaoWhitelistingCommon is ResolverClient, DaoConstants {

    function daoWhitelistingStorage()
        internal
        constant
        returns (DaoWhitelistingStorage _contract)
    {
        _contract = DaoWhitelistingStorage(get_contract(CONTRACT_STORAGE_DAO_WHITELISTING));
    }

    //done
    function isContract(address _address)
        internal
        constant
        returns (bool _isContract)
    {
        uint size;
        assembly {
            size := extcodesize(_address)
        }
        _isContract = size > 0;
    }

    //done
    /**
    @notice Check if a certain address is whitelisted to read sensitive information in the storage layer
    @dev if the address is an account, it is allowed to read. If the address is a contract, it has to be in the whitelist
    */
    function isWhitelisted(address _address)
        internal
        constant
        returns (bool _isWhitelisted)
    {
        if (isContract(_address)) {
            require(daoWhitelistingStorage().whitelist(_address));
        }
        _isWhitelisted = true;
    }
}





library DaoStructs {
    using DoublyLinkedList for DoublyLinkedList.Bytes;
    using SafeMath for uint256;

    struct PrlAction {
        // UTC timestamp at which the PRL action was done
        uint256 at;
        // IPFS hash of the document summarizing the action
        bytes32 doc;
        // Type of action
        // check PRL_ACTION_* in "./../common/DaoConstants.sol"
        uint256 actionId;
    }

    struct Voting {
        // UTC timestamp at which the voting round will start
        uint256 startTime;
        // Mapping of whether a commit was used in this voting round
        mapping (bytes32 => bool) usedCommits;
        // Mapping of commits by address. These are the commits during the commit phase in a voting round
        // This only stores the most recent commit in the voting round
        // In case a vote is edited, the previous commit is overwritten by the new commit
        // Only this new commit is verified by the salt at the reveal phase
        mapping (address => bytes32) commits;
        // This mapping is updated after the reveal phase, when votes are revealed
        // It is a mapping of address to weight of vote
        // Weight implies the lockedDGDStake of the address
        // If the address voted "NO", or didn't vote, this would be 0
        mapping (address => uint256) yesVotes;
        // This mapping is updated after the reveal phase, when votes are revealed
        // It is a mapping of address to weight of vote
        // Weight implies the lockedDGDStake of the address
        // If the address voted "YES", or didn't vote, this would be 0
        mapping (address => uint256) noVotes;
        // Boolean whether the voting round passed or not
        bool passed;
        // Boolean whether the voting round results were claimed or not
        // refer the claimProposalVotingResult function in "./../interative/DaoVotingClaims.sol"
        bool claimed;
        // Boolean whether the milestone following this voting round was funded or not
        // A milestone is funded when the proposer calls claimFunding in "./../interactive/DaoFundingManager.sol"
        bool funded;
    }

    struct ProposalVersion {
        // IPFS doc hash of this version of the proposal
        bytes32 docIpfsHash;
        // UTC timestamp at which this version was created
        uint256 created;
        // The number of milestones in the proposal as per this version
        uint256 milestoneCount;
        // List of fundings required by the proposal as per this version
        // The numbers are in gwei
        uint256[] milestoneFundings;
        // The final reward asked by the proposer for completion of the entire proposal
        uint256 finalReward;
        // When a proposal is finalized, the proposer can no longer add versions
        // but in order to make changes to the funding structure, they can add
        // more IPFS docs explaining the rationale. This is the list of those doc hashes
        bytes32[] moreDocs;
    }

    struct Proposal {
        // ID of the proposal. Also the IPFS hash of the first version
        bytes32 proposalId;
        // Address of the user who created the proposal
        address proposer;
        // Address of the moderator who endorsed the proposal
        address endorser;
        // current state of the proposal
        // refer PROPOSAL_STATE_* in "./../common/DaoConstants.sol"
        bytes32 currentState;
        // UTC timestamp at which the proposal was created
        uint256 timeCreated;
        // DoublyLinkedList of IPFS doc hashes of the various versions of the proposal
        DoublyLinkedList.Bytes proposalVersionDocs;
        // Mapping of version (IPFS doc hash) to ProposalVersion struct
        mapping (bytes32 => ProposalVersion) proposalVersions;
        // Voting struct for the draft voting round
        Voting draftVoting;
        // Mapping of voting round index (starts from 0) to Voting struct
        mapping (uint256 => Voting) votingRounds;
        // Boolean whether the proposal is paused/stopped at the moment
        bool isPausedOrStopped;
        // Boolean whether the proposal was created from a Digix address
        // founder addresses in DaoIdentity are Digix addresses
        bool isDigix;
        // Every proposal has a collateral tied to it with a value of
        // CONFIG_PREPROPOSAL_DEPOSIT (refer "./../storage/DaoConfigsStorage.sol")
        // Collateral can be in different states
        // refer COLLATERAL_STATUS_* in "./../common/DaoConstants.sol"
        uint256 collateralStatus;
        // The final version of the proposal
        // Every proposal needs to be finalized before it can be voted on
        // This is the IPFS doc hash of the final version
        bytes32 finalVersion;
        // List of PrlAction structs
        // These are all the actions done by the PRL on the proposal
        PrlAction[] prlActions;
    }

    function countVotes(Voting storage _voting, address[] memory _allUsers)
        public
        constant
        returns (uint256 _for, uint256 _against)
    {
        uint256 _n = _allUsers.length;
        for (uint256 i = 0; i < _n; i++) {
            if (_voting.yesVotes[_allUsers[i]] > 0) {
                _for = _for.add(_voting.yesVotes[_allUsers[i]]);
            } else if (_voting.noVotes[_allUsers[i]] > 0) {
                _against = _against.add(_voting.noVotes[_allUsers[i]]);
            }
        }
    }

    function listVotes(Voting storage _voting, address[] _allUsers, bool _vote)
        public
        constant
        returns (address[] memory _voters, uint256 _length)
    {
        uint256 _n = _allUsers.length;
        uint256 i;
        _length = 0;
        _voters = new address[](_n);
        if (_vote == true) {
            for (i = 0; i < _n; i++) {
                if (_voting.yesVotes[_allUsers[i]] > 0) {
                    _voters[_length] = _allUsers[i];
                    _length++;
                }
            }
        } else {
            for (i = 0; i < _n; i++) {
                if (_voting.noVotes[_allUsers[i]] > 0) {
                    _voters[_length] = _allUsers[i];
                    _length++;
                }
            }
        }
    }

    function readVote(Voting storage _voting, address _voter)
        public
        constant
        returns (bool _vote, uint256 _weight)
    {
        if (_voting.yesVotes[_voter] > 0) {
            _weight = _voting.yesVotes[_voter];
            _vote = true;
        } else {
            _weight = _voting.noVotes[_voter];
            _vote = false;
        }
    }

    function revealVote(
        Voting storage _voting,
        address _voter,
        bool _vote,
        uint256 _weight
    )
        public
    {
        if (_vote) {
            _voting.yesVotes[_voter] = _weight;
        } else {
            _voting.noVotes[_voter] = _weight;
        }
    }

    function readVersion(ProposalVersion storage _version)
        public
        constant
        returns (
            bytes32 _doc,
            uint256 _created,
            uint256[] _milestoneFundings,
            uint256 _finalReward
        )
    {
        _doc = _version.docIpfsHash;
        _created = _version.created;
        _milestoneFundings = _version.milestoneFundings;
        _finalReward = _version.finalReward;
    }

    function readProposalMilestone(Proposal storage _proposal, uint256 _milestoneIndex)
        public
        constant
        returns (uint256 _milestoneId, uint256 _funding)
    {
        require(_milestoneIndex >= 0);
        bytes32 _finalVersion = _proposal.finalVersion;
        if (_milestoneIndex < _proposal.proposalVersions[_finalVersion].milestoneFundings.length) {
            _milestoneId = _milestoneIndex;
            _funding = _proposal.proposalVersions[_finalVersion].milestoneFundings[_milestoneIndex];
        } else {
            _funding = _proposal.proposalVersions[_finalVersion].finalReward;
        }
    }

    function addProposalVersion(
        Proposal storage _proposal,
        bytes32 _newDoc,
        uint256[] _newMilestoneFundings,
        uint256 _finalReward
    )
        public
    {
        _proposal.proposalVersionDocs.append(_newDoc);
        _proposal.proposalVersions[_newDoc].docIpfsHash = _newDoc;
        _proposal.proposalVersions[_newDoc].created = now;
        _proposal.proposalVersions[_newDoc].milestoneCount = _newMilestoneFundings.length;
        _proposal.proposalVersions[_newDoc].milestoneFundings = _newMilestoneFundings;
        _proposal.proposalVersions[_newDoc].finalReward = _finalReward;
    }

    struct SpecialProposal {
        // ID of the special proposal
        // This is the IPFS doc hash of the proposal
        bytes32 proposalId;
        // Address of the user who created the special proposal
        // This address should also be in the ROLES_FOUNDERS group
        // refer "./../storage/DaoIdentityStorage.sol"
        address proposer;
        // UTC timestamp at which the proposal was created
        uint256 timeCreated;
        // Voting struct for the special proposal
        Voting voting;
        // List of the new uint256 configs as per the special proposal
        uint256[] uintConfigs;
        // List of the new address configs as per the special proposal
        address[] addressConfigs;
        // List of the new bytes32 configs as per the special proposal
        bytes32[] bytesConfigs;
    }

    // All configs are as per the DaoConfigsStorage values at the time when
    // calculateGlobalRewardsBeforeNewQuarter is called by founder in that quarter
    struct DaoQuarterInfo {
        // The minimum quarter points required
        // below this, reputation will be deducted
        uint256 minimalParticipationPoint;
        // The scaling factor for quarter point
        uint256 quarterPointScalingFactor;
        // The scaling factor for reputation point
        uint256 reputationPointScalingFactor;
        // The summation of effectiveDGDs in the previous quarter
        // The effectiveDGDs represents the effective participation in DigixDAO in a quarter
        // Which depends of lockedDGDStake, quarter point and reputation point
        // This value is the summation of all participant effectiveDGDs
        // used as a whole to find the fraction of effective participation by an address
        uint256 totalEffectiveDGDPreviousQuarter;
        // The minimum moderator quarter point required
        // below this, reputation will be deducted for moderators
        uint256 moderatorMinimalParticipationPoint;
        // the scaling factor for moderator quarter point
        uint256 moderatorQuarterPointScalingFactor;
        // the scaling factor for moderator reputation point
        uint256 moderatorReputationPointScalingFactor;
        // The summation of effectiveDGDs (only specific to moderators)
        uint256 totalEffectiveModeratorDGDLastQuarter;
        // UTC timestamp at which the DGX rewards are distributable to Holders
        uint256 dgxDistributionDay;
        // The DGX that enters DigixDAO at the start of the quarter
        // This is the rewards pool for the previous quarter
        uint256 dgxRewardsPoolLastQuarter;
        // The summation of all dgxRewardsPoolLastQuarter up until this quarter
        uint256 sumRewardsFromBeginning;
    }

    // The intermediate results are stored in IntermediateResultsStorage
    // There are many function calls where all calculations/summations cannot be done
    // and require multiple iterations. But since calculation depends on some values of the
    // previous iteration, we store the intermediate results. This is a generalized
    // struct, and is used in multiple function calls
    struct IntermediateResults {
        // Address of user until which the calculation has been done
        address countedUntil;
        // weight of "FOR" votes counted up until the iteration of calculation
        uint256 currentForCount;
        // weight of "AGAINST" votes counted up until the iteration of calculation
        uint256 currentAgainstCount;
        // summation of effectiveDGDs up until the iteration of calculation
        uint256 currentSumOfEffectiveBalance;
    }
}








contract DaoStorage is DaoWhitelistingCommon, BytesIteratorStorage {
    using DoublyLinkedList for DoublyLinkedList.Bytes;
    using DaoStructs for DaoStructs.Voting;
    using DaoStructs for DaoStructs.Proposal;
    using DaoStructs for DaoStructs.ProposalVersion;

    DoublyLinkedList.Bytes allProposals;
    mapping (bytes32 => DaoStructs.Proposal) proposalsById;
    mapping (bytes32 => DoublyLinkedList.Bytes) proposalsByState;
    mapping (uint256 => uint256) public proposalCountByQuarter;

    constructor(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO, _resolver));
    }

    /////////////////////////////// READ FUNCTIONS //////////////////////////////

    /// @notice read all information and details of proposal
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc Proposal ID, i.e. hash of IPFS doc
    /// return {
    ///   "_doc": "Original IPFS doc of proposal, also ID of proposal",
    ///   "_proposer": "Address of the proposer",
    ///   "_endorser": "Address of the moderator that endorsed the proposal",
    ///   "_state": "Current state of the proposal",
    ///   "_timeCreated": "UTC timestamp at which proposal was created",
    ///   "_nVersions": "Number of versions of the proposal",
    ///   "_latestVersionDoc": "IPFS doc hash of the latest version of this proposal",
    ///   "_finalVersion": "If finalized, the version of the final proposal",
    ///   "_pausedOrStopped": "If the proposal is paused/stopped at the moment",
    ///   "_isDigixProposal": "If the proposal has been created by founder or not"
    /// }
    function readProposal(bytes32 _proposalId)
        public
        constant
        returns (
            bytes32 _doc,
            address _proposer,
            address _endorser,
            bytes32 _state,
            uint256 _timeCreated,
            uint256 _nVersions,
            bytes32 _latestVersionDoc,
            bytes32 _finalVersion,
            bool _pausedOrStopped,
            bool _isDigixProposal
        )
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _doc = _proposal.proposalId;
        _proposer = _proposal.proposer;
        _endorser = _proposal.endorser;
        _state = _proposal.currentState;
        _timeCreated = _proposal.timeCreated;
        _nVersions = read_total_bytesarray(_proposal.proposalVersionDocs);
        _latestVersionDoc = read_last_from_bytesarray(_proposal.proposalVersionDocs);
        _finalVersion = _proposal.finalVersion;
        _pausedOrStopped = _proposal.isPausedOrStopped;
        _isDigixProposal = _proposal.isDigix;
    }

    function readProposalProposer(bytes32 _proposalId)
        public
        constant
        returns (address _proposer)
    {
        _proposer = proposalsById[_proposalId].proposer;
    }

    function readTotalPrlActions(bytes32 _proposalId)
        public
        constant
        returns (uint256 _length)
    {
        _length = proposalsById[_proposalId].prlActions.length;
    }

    function readPrlAction(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (uint256 _actionId, uint256 _time, bytes32 _doc)
    {
        DaoStructs.PrlAction[] memory _actions = proposalsById[_proposalId].prlActions;
        require(_index < _actions.length);
        _actionId = _actions[_index].actionId;
        _time = _actions[_index].at;
        _doc = _actions[_index].doc;
    }

    function readProposalDraftVotingResult(bytes32 _proposalId)
        public
        constant
        returns (bool _result)
    {
        _result = proposalsById[_proposalId].draftVoting.passed;
    }

    function readProposalVotingResult(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (bool _result)
    {
        _result = proposalsById[_proposalId].votingRounds[_index].passed;
    }

    function readProposalDraftVotingTime(bytes32 _proposalId)
        public
        constant
        returns (uint256 _start)
    {
        _start = proposalsById[_proposalId].draftVoting.startTime;
    }

    function readProposalVotingTime(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (uint256 _start)
    {
        _start = proposalsById[_proposalId].votingRounds[_index].startTime;
    }

    function readDraftVotingCount(bytes32 _proposalId, address[] memory _allUsers)
        public
        constant
        returns (uint256 _for, uint256 _against)
    {
        return proposalsById[_proposalId].draftVoting.countVotes(_allUsers);
    }

    function readVotingCount(bytes32 _proposalId, uint256 _index, address[] _allUsers)
        public
        constant
        returns (uint256 _for, uint256 _against)
    {
        return proposalsById[_proposalId].votingRounds[_index].countVotes(_allUsers);
    }

    function readVotingRoundVotes(bytes32 _proposalId, uint256 _index, address[] _allUsers, bool _vote)
        public
        constant
        returns (address[] memory _voters, uint256 _length)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].votingRounds[_index].listVotes(_allUsers, _vote);
    }

    function readDraftVote(bytes32 _proposalId, address _voter)
        public
        constant
        returns (bool _vote, uint256 _weight)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].draftVoting.readVote(_voter);
    }

    /// @notice returns the latest committed vote by a voter on a proposal
    /// @param _proposalId proposal ID
    /// @param _voter address of the voter
    /// @return {
    ///   "_commitHash": ""
    /// }
    function readComittedVote(bytes32 _proposalId, uint256 _index, address _voter)
        public
        constant
        returns (bytes32 _commitHash)
    {
        require(isWhitelisted(msg.sender));
        _commitHash = proposalsById[_proposalId].votingRounds[_index].commits[_voter];
    }

    function readVote(bytes32 _proposalId, uint256 _index, address _voter)
        public
        constant
        returns (bool _vote, uint256 _weight)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].votingRounds[_index].readVote(_voter);
    }

    /// @notice get all information and details of the first proposal
    /// return {
    ///   "_id": ""
    /// }
    function getFirstProposal()
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_first_from_bytesarray(allProposals);
    }

    /// @notice get all information and details of the last proposal
    /// return {
    ///   "_id": ""
    /// }
    function getLastProposal()
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_last_from_bytesarray(allProposals);
    }

    /// @notice get all information and details of proposal next to _proposalId
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// return {
    ///   "_id": ""
    /// }
    function getNextProposal(bytes32 _proposalId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_next_from_bytesarray(
            allProposals,
            _proposalId
        );
    }

    /// @notice get all information and details of proposal previous to _proposalId
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// return {
    ///   "_id": ""
    /// }
    function getPreviousProposal(bytes32 _proposalId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_previous_from_bytesarray(
            allProposals,
            _proposalId
        );
    }

    /// @notice get all information and details of the first proposal in state _stateId
    /// @param _stateId State ID of the proposal
    /// return {
    ///   "_id": ""
    /// }
    function getFirstProposalInState(bytes32 _stateId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_first_from_bytesarray(proposalsByState[_stateId]);
    }

    /// @notice get all information and details of the last proposal in state _stateId
    /// @param _stateId State ID of the proposal
    /// return {
    ///   "_id": ""
    /// }
    function getLastProposalInState(bytes32 _stateId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_last_from_bytesarray(proposalsByState[_stateId]);
    }

    /// @notice get all information and details of the next proposal to _proposalId in state _stateId
    /// @param _stateId State ID of the proposal
    /// return {
    ///   "_id": ""
    /// }
    function getNextProposalInState(bytes32 _stateId, bytes32 _proposalId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_next_from_bytesarray(
            proposalsByState[_stateId],
            _proposalId
        );
    }

    /// @notice get all information and details of the previous proposal to _proposalId in state _stateId
    /// @param _stateId State ID of the proposal
    /// return {
    ///   "_id": ""
    /// }
    function getPreviousProposalInState(bytes32 _stateId, bytes32 _proposalId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_previous_from_bytesarray(
            proposalsByState[_stateId],
            _proposalId
        );
    }

    /// @notice read proposal version details for a specific version
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// @param _version Version of proposal, i.e. hash of IPFS doc for specific version
    /// return {
    ///   "_doc": "",
    ///   "_created": "",
    ///   "_milestoneFundings": ""
    /// }
    function readProposalVersion(bytes32 _proposalId, bytes32 _version)
        public
        constant
        returns (
            bytes32 _doc,
            uint256 _created,
            uint256[] _milestoneFundings,
            uint256 _finalReward
        )
    {
        return proposalsById[_proposalId].proposalVersions[_version].readVersion();
    }

    /**
    @notice Read the fundings of a finalized proposal
    @return {
        "_fundings": "fundings for the milestones",
        "_finalReward": "the final reward"
    }
    */
    function readProposalFunding(bytes32 _proposalId)
        public
        constant
        returns (uint256[] memory _fundings, uint256 _finalReward)
    {
        bytes32 _finalVersion = proposalsById[_proposalId].finalVersion;
        require(_finalVersion != EMPTY_BYTES);
        _fundings = proposalsById[_proposalId].proposalVersions[_finalVersion].milestoneFundings;
        _finalReward = proposalsById[_proposalId].proposalVersions[_finalVersion].finalReward;
    }

    function readProposalMilestone(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (uint256 _milestoneId, uint256 _funding)
    {
        return proposalsById[_proposalId].readProposalMilestone(_index);
    }

    /// @notice get proposal version details for the first version
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// return {
    ///   "_version": ""
    /// }
    function getFirstProposalVersion(bytes32 _proposalId)
        public
        constant
        returns (bytes32 _version)
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _version = read_first_from_bytesarray(_proposal.proposalVersionDocs);
    }

    /// @notice get proposal version details for the last version
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// return {
    ///   "_version": ""
    /// }
    function getLastProposalVersion(bytes32 _proposalId)
        public
        constant
        returns (bytes32 _version)
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _version = read_last_from_bytesarray(_proposal.proposalVersionDocs);
    }

    /// @notice get proposal version details for the next version to _version
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// @param _version Version of proposal
    /// return {
    ///   "_nextVersion": ""
    /// }
    function getNextProposalVersion(bytes32 _proposalId, bytes32 _version)
        public
        constant
        returns (bytes32 _nextVersion)
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _nextVersion = read_next_from_bytesarray(
            _proposal.proposalVersionDocs,
            _version
        );
    }

    /// @notice get proposal version details for the previous version to _version
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// @param _version Version of proposal
    /// return {
    ///   "_previousVersion": ""
    /// }
    function getPreviousProposalVersion(bytes32 _proposalId, bytes32 _version)
        public
        constant
        returns (bytes32 _previousVersion)
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _previousVersion = read_previous_from_bytesarray(
            _proposal.proposalVersionDocs,
            _version
        );
    }

    function isDraftClaimed(bytes32 _proposalId)
        public
        constant
        returns (bool _claimed)
    {
        _claimed = proposalsById[_proposalId].draftVoting.claimed;
    }

    function isClaimed(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (bool _claimed)
    {
        _claimed = proposalsById[_proposalId].votingRounds[_index].claimed;
    }

    function readProposalCollateralStatus(bytes32 _proposalId)
        public
        constant
        returns (uint256 _status)
    {
        _status = proposalsById[_proposalId].collateralStatus;
    }

    /// @notice Read the additional docs that are added after the proposal is finalized
    /// @dev Will throw if the propsal is not finalized yet
    function readProposalDocs(bytes32 _proposalId)
        public
        constant
        returns (bytes32[] _moreDocs)
    {
        bytes32 _finalVersion = proposalsById[_proposalId].finalVersion;
        require(_finalVersion != EMPTY_BYTES);
        _moreDocs = proposalsById[_proposalId].proposalVersions[_finalVersion].moreDocs;
    }

    function readIfMilestoneFunded(bytes32 _proposalId, uint256 _milestoneId)
        public
        constant
        returns (bool _funded)
    {
        _funded = proposalsById[_proposalId].votingRounds[_milestoneId].funded;
    }

    ////////////////////////////// WRITE FUNCTIONS //////////////////////////////

    function addProposal(
        bytes32 _doc,
        address _proposer,
        uint256[] _milestoneFundings,
        uint256 _finalReward,
        bool _isFounder
    )
        public
    {
        require(sender_is(CONTRACT_DAO));

        allProposals.append(_doc);
        proposalsByState[PROPOSAL_STATE_PREPROPOSAL].append(_doc);
        proposalsById[_doc].proposalId = _doc;
        proposalsById[_doc].proposer = _proposer;
        proposalsById[_doc].currentState = PROPOSAL_STATE_PREPROPOSAL;
        proposalsById[_doc].timeCreated = now;
        proposalsById[_doc].isDigix = _isFounder;
        proposalsById[_doc].addProposalVersion(_doc, _milestoneFundings, _finalReward);
    }

    function editProposal(
        bytes32 _proposalId,
        bytes32 _newDoc,
        uint256[] _newMilestoneFundings,
        uint256 _finalReward
    )
        public
    {
        require(sender_is(CONTRACT_DAO));

        proposalsById[_proposalId].addProposalVersion(_newDoc, _newMilestoneFundings, _finalReward);
    }

    /// @notice change fundings of a proposal
    /// @dev Will throw if the proposal is not finalized yet
    function changeFundings(bytes32 _proposalId, uint256[] _newMilestoneFundings, uint256 _finalReward)
        public
    {
        require(sender_is(CONTRACT_DAO));

        bytes32 _finalVersion = proposalsById[_proposalId].finalVersion;
        require(_finalVersion != EMPTY_BYTES);
        proposalsById[_proposalId].proposalVersions[_finalVersion].milestoneFundings = _newMilestoneFundings;
        proposalsById[_proposalId].proposalVersions[_finalVersion].finalReward = _finalReward;
    }

    /// @dev Will throw if the proposal is not finalized yet
    function addProposalDoc(bytes32 _proposalId, bytes32 _newDoc)
        public
    {
        require(sender_is(CONTRACT_DAO));

        bytes32 _finalVersion = proposalsById[_proposalId].finalVersion;
        require(_finalVersion != EMPTY_BYTES); //already checked in interactive layer, but why not
        proposalsById[_proposalId].proposalVersions[_finalVersion].moreDocs.push(_newDoc);
    }

    function finalizeProposal(bytes32 _proposalId)
        public
    {
        require(sender_is(CONTRACT_DAO));

        proposalsById[_proposalId].finalVersion = getLastProposalVersion(_proposalId);
    }

    function updateProposalEndorse(
        bytes32 _proposalId,
        address _endorser
    )
        public
    {
        require(sender_is(CONTRACT_DAO));

        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _proposal.endorser = _endorser;
        _proposal.currentState = PROPOSAL_STATE_DRAFT;
        proposalsByState[PROPOSAL_STATE_PREPROPOSAL].remove_item(_proposalId);
        proposalsByState[PROPOSAL_STATE_DRAFT].append(_proposalId);
    }

    function setProposalDraftPass(bytes32 _proposalId, bool _result)
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING_CLAIMS));

        proposalsById[_proposalId].draftVoting.passed = _result;
        if (_result) {
            proposalsByState[PROPOSAL_STATE_DRAFT].remove_item(_proposalId);
            proposalsByState[PROPOSAL_STATE_MODERATED].append(_proposalId);
            proposalsById[_proposalId].currentState = PROPOSAL_STATE_MODERATED;
        } else {
            closeProposalInternal(_proposalId);
        }
    }

    function setProposalPass(bytes32 _proposalId, uint256 _index, bool _result)
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING_CLAIMS));

        if (!_result) {
            closeProposalInternal(_proposalId);
        } else if (_index == 0) {
            proposalsByState[PROPOSAL_STATE_MODERATED].remove_item(_proposalId);
            proposalsByState[PROPOSAL_STATE_ONGOING].append(_proposalId);
            proposalsById[_proposalId].currentState = PROPOSAL_STATE_ONGOING;
        }
        proposalsById[_proposalId].votingRounds[_index].passed = _result;
    }

    function setProposalDraftVotingTime(
        bytes32 _proposalId,
        uint256 _time
    )
        public
    {
        require(sender_is(CONTRACT_DAO));

        proposalsById[_proposalId].draftVoting.startTime = _time;
    }

    function setProposalVotingTime(
        bytes32 _proposalId,
        uint256 _index,
        uint256 _time
    )
        public
    {
        require(sender_is_from([CONTRACT_DAO, CONTRACT_DAO_VOTING_CLAIMS, EMPTY_BYTES]));

        proposalsById[_proposalId].votingRounds[_index].startTime = _time;
    }

    function setDraftVotingClaim(bytes32 _proposalId, bool _claimed)
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING_CLAIMS));
        proposalsById[_proposalId].draftVoting.claimed = _claimed;
    }

    function setVotingClaim(bytes32 _proposalId, uint256 _index, bool _claimed)
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING_CLAIMS));
        proposalsById[_proposalId].votingRounds[_index].claimed = _claimed;
    }

    function setProposalCollateralStatus(bytes32 _proposalId, uint256 _status)
        public
    {
        require(sender_is_from([CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_FUNDING_MANAGER, CONTRACT_DAO]));
        proposalsById[_proposalId].collateralStatus = _status;
    }

    function updateProposalPRL(
        bytes32 _proposalId,
        uint256 _action,
        bytes32 _doc,
        uint256 _time
    )
        public
    {
        require(sender_is(CONTRACT_DAO));
        DaoStructs.PrlAction memory prlAction;
        prlAction.at = _time;
        prlAction.doc = _doc;
        prlAction.actionId = _action;
        proposalsById[_proposalId].prlActions.push(prlAction);

        if (_action == PRL_ACTION_PAUSE) {
          proposalsById[_proposalId].isPausedOrStopped = true;
        } else if (_action == PRL_ACTION_UNPAUSE) {
          proposalsById[_proposalId].isPausedOrStopped = false;
        } else { // STOP
          proposalsById[_proposalId].isPausedOrStopped = true;
          closeProposalInternal(_proposalId);
        }
    }

    function closeProposalInternal(bytes32 _proposalId)
        internal
    {
        bytes32 _currentState = proposalsById[_proposalId].currentState;
        proposalsByState[_currentState].remove_item(_proposalId);
        proposalsByState[PROPOSAL_STATE_CLOSED].append(_proposalId);
        proposalsById[_proposalId].currentState = PROPOSAL_STATE_CLOSED;
    }

    function addDraftVote(
        bytes32 _proposalId,
        address _voter,
        bool _vote,
        uint256 _weight
    )
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING));

        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        if (_vote) {
            _proposal.draftVoting.yesVotes[_voter] = _weight;
            if (_proposal.draftVoting.noVotes[_voter] > 0) { // minimize number of writes to storage, since EIP-1087 is not implemented yet
                _proposal.draftVoting.noVotes[_voter] = 0;
            }
        } else {
            _proposal.draftVoting.noVotes[_voter] = _weight;
            if (_proposal.draftVoting.yesVotes[_voter] > 0) {
                _proposal.draftVoting.yesVotes[_voter] = 0;
            }
        }
    }

    function commitVote(
        bytes32 _proposalId,
        bytes32 _hash,
        address _voter,
        uint256 _index
    )
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING));

        proposalsById[_proposalId].votingRounds[_index].commits[_voter] = _hash;
    }

    function revealVote(
        bytes32 _proposalId,
        address _voter,
        bool _vote,
        uint256 _weight,
        uint256 _index
    )
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING));

        proposalsById[_proposalId].votingRounds[_index].revealVote(_voter, _vote, _weight);
    }

    function addNonDigixProposalCountInQuarter(uint256 _quarterIndex)
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING_CLAIMS));
        proposalCountByQuarter[_quarterIndex] = proposalCountByQuarter[_quarterIndex].add(1);
    }

    function closeProposal(bytes32 _proposalId)
        public
    {
        require(sender_is(CONTRACT_DAO));
        closeProposalInternal(_proposalId);
    }

    function setMilestoneFunded(bytes32 _proposalId, uint256 _milestoneId)
        public
    {
        require(sender_is(CONTRACT_DAO_FUNDING_MANAGER));
        proposalsById[_proposalId].votingRounds[_milestoneId].funded = true;
    }
}




/**
  @title Address Iterator Storage
  @author DigixGlobal Pte Ltd
  @notice See: [Doubly Linked List](/DoublyLinkedList)
*/
contract AddressIteratorStorage {

  // Initialize Doubly Linked List of Address
  using DoublyLinkedList for DoublyLinkedList.Address;

  /**
    @notice Reads the first item from the list of Address
    @param _list The source list
    @return {"_item" : "The first item from the list"}
  */
  function read_first_from_addresses(DoublyLinkedList.Address storage _list)
           internal
           constant
           returns (address _item)
  {
    _item = _list.start_item();
  }


  /**
    @notice Reads the last item from the list of Address
    @param _list The source list
    @return {"_item" : "The last item from the list"}
  */
  function read_last_from_addresses(DoublyLinkedList.Address storage _list)
           internal
           constant
           returns (address _item)
  {
    _item = _list.end_item();
  }

  /**
    @notice Reads the next item on the list of Address
    @param _list The source list
    @param _current_item The current item to be used as base line
    @return {"_item" : "The next item from the list based on the specieid `_current_item`"}
  */
  function read_next_from_addresses(DoublyLinkedList.Address storage _list, address _current_item)
           internal
           constant
           returns (address _item)
  {
    _item = _list.next_item(_current_item);
  }

  /**
    @notice Reads the previous item on the list of Address
    @param _list The source list
    @param _current_item The current item to be used as base line
    @return {"_item" : "The previous item from the list based on the spcified `_current_item`"}
  */
  function read_previous_from_addresses(DoublyLinkedList.Address storage _list, address _current_item)
           internal
           constant
           returns (address _item)
  {
    _item = _list.previous_item(_current_item);
  }

  /**
    @notice Reads the list of Address and returns the length of the list
    @param _list The source list
    @return {"_count": "The lenght of the list"}
  */
  function read_total_addresses(DoublyLinkedList.Address storage _list)
           internal
           constant
           returns (uint256 _count)
  {
    _count = _list.total();
  }

}







contract DaoStakeStorage is ResolverClient, DaoConstants, AddressIteratorStorage {
    using DoublyLinkedList for DoublyLinkedList.Address;

    // This is the DGD stake of a user (one that is considered in the DAO)
    mapping (address => uint256) public lockedDGDStake;

    // This is the actual number of DGDs locked by user
    // may be more than the lockedDGDStake
    // in case they locked during the main phase
    mapping (address => uint256) public actualLockedDGD;

    // The total locked DGDs in the DAO (summation of lockedDGDStake)
    uint256 public totalLockedDGDStake;

    // The total locked DGDs by moderators
    uint256 public totalModeratorLockedDGDStake;

    // The list of participants in DAO
    // actual participants will be subset of this list
    DoublyLinkedList.Address allParticipants;

    // The list of moderators in DAO
    // actual moderators will be subset of this list
    DoublyLinkedList.Address allModerators;

    // Boolean to mark if an address has redeemed
    // reputation points for their DGD Badge
    mapping (address => bool) public redeemedBadge;

    constructor(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_STAKE, _resolver));
    }

    function redeemBadge(address _user)
        public
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        redeemedBadge[_user] = true;
    }

    function updateTotalLockedDGDStake(uint256 _totalLockedDGDStake)
        public
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        totalLockedDGDStake = _totalLockedDGDStake;
    }

    function updateTotalModeratorLockedDGDs(uint256 _totalLockedDGDStake)
        public
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        totalModeratorLockedDGDStake = _totalLockedDGDStake;
    }

    function updateUserDGDStake(address _user, uint256 _actualLockedDGD, uint256 _lockedDGDStake)
        public
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        actualLockedDGD[_user] = _actualLockedDGD;
        lockedDGDStake[_user] = _lockedDGDStake;
    }

    function readUserDGDStake(address _user)
        public
        constant
        returns (
            uint256 _actualLockedDGD,
            uint256 _lockedDGDStake
        )
    {
        _actualLockedDGD = actualLockedDGD[_user];
        _lockedDGDStake = lockedDGDStake[_user];
    }

    function lockedDGDStake(address _user)
        public
        constant
        returns (uint256 _stake)
    {
        _stake = lockedDGDStake[_user];
    }

    function addToParticipantList(address _user)
        public
        returns (bool _success)
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        _success = allParticipants.append(_user);
    }

    function removeFromParticipantList(address _user)
        public
        returns (bool _success)
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        _success = allParticipants.remove_item(_user);
    }

    function addToModeratorList(address _user)
        public
        returns (bool _success)
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        _success = allModerators.append(_user);
    }

    function removeFromModeratorList(address _user)
        public
        returns (bool _success)
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        _success = allModerators.remove_item(_user);
    }

    function isInParticipantList(address _user)
        public
        constant
        returns (bool _is)
    {
        uint256 _index = allParticipants.find(_user);
        if (_index == 0) {
            _is = false;
        } else {
            _is = true;
        }
    }

    function isInModeratorsList(address _user)
        public
        constant
        returns (bool _is)
    {
        uint256 _index = allModerators.find(_user);
        if (_index == 0) {
            _is = false;
        } else {
            _is = true;
        }
    }

    function readFirstModerator()
        public
        constant
        returns (address _item)
    {
        _item = read_first_from_addresses(allModerators);
    }

    function readLastModerator()
        public
        constant
        returns (address _item)
    {
        _item = read_last_from_addresses(allModerators);
    }

    function readNextModerator(address _current_item)
        public
        constant
        returns (address _item)
    {
        _item = read_next_from_addresses(allModerators, _current_item);
    }

    function readPreviousModerator(address _current_item)
        public
        constant
        returns (address _item)
    {
        _item = read_previous_from_addresses(allModerators, _current_item);
    }

    function readTotalModerators()
        public
        constant
        returns (uint256 _total_count)
    {
        _total_count = read_total_addresses(allModerators);
    }

    function readFirstParticipant()
        public
        constant
        returns (address _item)
    {
        _item = read_first_from_addresses(allParticipants);
    }

    function readLastParticipant()
        public
        constant
        returns (address _item)
    {
        _item = read_last_from_addresses(allParticipants);
    }

    function readNextParticipant(address _current_item)
        public
        constant
        returns (address _item)
    {
        _item = read_next_from_addresses(allParticipants, _current_item);
    }

    function readPreviousParticipant(address _current_item)
        public
        constant
        returns (address _item)
    {
        _item = read_previous_from_addresses(allParticipants, _current_item);
    }

    function readTotalParticipant()
        public
        constant
        returns (uint256 _total_count)
    {
        _total_count = read_total_addresses(allParticipants);
    }
}










/**
@title Contract to list various storage states from DigixDAO
@author Digix Holdings
*/
contract DaoListingService is ResolverClient,
                              DaoConstants,
                              AddressIteratorInteractive,
                              BytesIteratorInteractive,
                              IndexedBytesIteratorInteractive {

    /**
    @notice Constructor
    @param _resolver address of contract resolver
    */
    constructor(address _resolver) public {
        require(init(CONTRACT_SERVICE_DAO_LISTING, _resolver));
    }

    function daoStakeStorage()
      internal
      constant
      returns (DaoStakeStorage _contract)
    {
      _contract = DaoStakeStorage(get_contract(CONTRACT_STORAGE_DAO_STAKE));
    }

    function daoStorage()
      internal
      constant
      returns (DaoStorage _contract)
    {
      _contract = DaoStorage(get_contract(CONTRACT_STORAGE_DAO));
    }

    /**
    @notice function to list moderators
    @dev note that this list may include some additional entries that are
         not moderators in the current quarter. This may happen if they
         were moderators in the previous quarter, but have not confirmed
         their participation in the current quarter. For a single address,
         a better way to know if moderator or not is:
         contracts.dao.isModerator(_user)
    @param _count number of addresses to list
    @param _from_start boolean, whether to list from start or end
    @return {
      "_moderators": "list of moderator addresses"
    }
    */
    function listModerators(uint256 _count, bool _from_start)
        public
        constant
        returns (address[] _moderators)
    {
        _moderators = list_addresses(
            _count,
            daoStakeStorage().readFirstModerator,
            daoStakeStorage().readLastModerator,
            daoStakeStorage().readNextModerator,
            daoStakeStorage().readPreviousModerator,
            _from_start
        );
    }

    /**
    @notice function to list moderators from a particular moderator
    @dev note that this list may include some additional entries that are
         not moderators in the current quarter. This may happen if they
         were moderators in the previous quarter, but have not confirmed
         their participation in the current quarter. For a single address,
         a better way to know if moderator or not is:
         contracts.dao.isModerator(_user)
    @param _currentModerator list from this moderator address
    @param _count number of addresses to list
    @param _from_start boolean, whether to list from start or end
    @return {
      "_moderators": "list of moderator addresses"
    }
    */
    function listModeratorsFrom(
        address _currentModerator,
        uint256 _count,
        bool _from_start
    )
        public
        constant
        returns (address[] _moderators)
    {
        _moderators = list_addresses_from(
            _currentModerator,
            _count,
            daoStakeStorage().readFirstModerator,
            daoStakeStorage().readLastModerator,
            daoStakeStorage().readNextModerator,
            daoStakeStorage().readPreviousModerator,
            _from_start
        );
    }

    /**
    @notice function to list participants
    @dev note that this list may include some additional entries that are
         not participants in the current quarter. This may happen if they
         were participants in the previous quarter, but have not confirmed
         their participation in the current quarter. For a single address,
         a better way to know if participant or not is:
         contracts.dao.isParticipant(_user)
    @param _count number of addresses to list
    @param _from_start boolean, whether to list from start or end
    @return {
      "_participants": "list of participant addresses"
    }
    */
    function listParticipants(uint256 _count, bool _from_start)
        public
        constant
        returns (address[] _participants)
    {
        _participants = list_addresses(
            _count,
            daoStakeStorage().readFirstParticipant,
            daoStakeStorage().readLastParticipant,
            daoStakeStorage().readNextParticipant,
            daoStakeStorage().readPreviousParticipant,
            _from_start
        );
    }

    /**
    @notice function to list participants from a particular participant
    @dev note that this list may include some additional entries that are
         not participants in the current quarter. This may happen if they
         were participants in the previous quarter, but have not confirmed
         their participation in the current quarter. For a single address,
         a better way to know if participant or not is:
         contracts.dao.isParticipant(_user)
    @param _currentParticipant list from this participant address
    @param _count number of addresses to list
    @param _from_start boolean, whether to list from start or end
    @return {
      "_participants": "list of participant addresses"
    }
    */
    function listParticipantsFrom(
        address _currentParticipant,
        uint256 _count,
        bool _from_start
    )
        public
        constant
        returns (address[] _participants)
    {
        _participants = list_addresses_from(
            _currentParticipant,
            _count,
            daoStakeStorage().readFirstParticipant,
            daoStakeStorage().readLastParticipant,
            daoStakeStorage().readNextParticipant,
            daoStakeStorage().readPreviousParticipant,
            _from_start
        );
    }

    /**
    @notice function to list _count no. of proposals
    @param _count number of proposals to list
    @param _from_start boolean value, true if count from start, false if count from end
    @return {
      "_proposals": "the list of proposal IDs"
    }
    */
    function listProposals(
        uint256 _count,
        bool _from_start
    )
        public
        constant
        returns (bytes32[] _proposals)
    {
        _proposals = list_bytesarray(
            _count,
            daoStorage().getFirstProposal,
            daoStorage().getLastProposal,
            daoStorage().getNextProposal,
            daoStorage().getPreviousProposal,
            _from_start
        );
    }

    /**
    @notice function to list _count no. of proposals from _currentProposal
    @param _currentProposal ID of proposal to list proposals from
    @param _count number of proposals to list
    @param _from_start boolean value, true if count forwards, false if count backwards
    @return {
      "_proposals": "the list of proposal IDs"
    }
    */
    function listProposalsFrom(
        bytes32 _currentProposal,
        uint256 _count,
        bool _from_start
    )
        public
        constant
        returns (bytes32[] _proposals)
    {
        _proposals = list_bytesarray_from(
            _currentProposal,
            _count,
            daoStorage().getFirstProposal,
            daoStorage().getLastProposal,
            daoStorage().getNextProposal,
            daoStorage().getPreviousProposal,
            _from_start
        );
    }

    /**
    @notice function to list _count no. of proposals in state _stateId
    @param _stateId state of proposal
    @param _count number of proposals to list
    @param _from_start boolean value, true if count from start, false if count from end
    @return {
      "_proposals": "the list of proposal IDs"
    }
    */
    function listProposalsInState(
        bytes32 _stateId,
        uint256 _count,
        bool _from_start
    )
        public
        constant
        returns (bytes32[] _proposals)
    {
        _proposals = list_indexed_bytesarray(
            _stateId,
            _count,
            daoStorage().getFirstProposalInState,
            daoStorage().getLastProposalInState,
            daoStorage().getNextProposalInState,
            daoStorage().getPreviousProposalInState,
            _from_start
        );
    }

    /**
    @notice function to list _count no. of proposals in state _stateId from _currentProposal
    @param _stateId state of proposal
    @param _currentProposal ID of proposal to list proposals from
    @param _count number of proposals to list
    @param _from_start boolean value, true if count forwards, false if count backwards
    @return {
      "_proposals": "the list of proposal IDs"
    }
    */
    function listProposalsInStateFrom(
        bytes32 _stateId,
        bytes32 _currentProposal,
        uint256 _count,
        bool _from_start
    )
        public
        constant
        returns (bytes32[] _proposals)
    {
        _proposals = list_indexed_bytesarray_from(
            _stateId,
            _currentProposal,
            _count,
            daoStorage().getFirstProposalInState,
            daoStorage().getLastProposalInState,
            daoStorage().getNextProposalInState,
            daoStorage().getPreviousProposalInState,
            _from_start
        );
    }

    /**
    @notice function to list proposal versions
    @param _proposalId ID of the proposal
    @param _count number of proposal versions to list
    @param _from_start boolean, true to list from start, false to list from end
    @return {
      "_versions": "list of proposal versions"
    }
    */
    function listProposalVersions(
        bytes32 _proposalId,
        uint256 _count,
        bool _from_start
    )
        public
        constant
        returns (bytes32[] _versions)
    {
        _versions = list_indexed_bytesarray(
            _proposalId,
            _count,
            daoStorage().getFirstProposalVersion,
            daoStorage().getLastProposalVersion,
            daoStorage().getNextProposalVersion,
            daoStorage().getPreviousProposalVersion,
            _from_start
        );
    }

    /**
    @notice function to list proposal versions from a particular version
    @param _proposalId ID of the proposal
    @param _currentVersion version to list _count versions from
    @param _count number of proposal versions to list
    @param _from_start boolean, true to list from start, false to list from end
    @return {
      "_versions": "list of proposal versions"
    }
    */
    function listProposalVersionsFrom(
        bytes32 _proposalId,
        bytes32 _currentVersion,
        uint256 _count,
        bool _from_start
    )
        public
        constant
        returns (bytes32[] _versions)
    {
        _versions = list_indexed_bytesarray_from(
            _proposalId,
            _currentVersion,
            _count,
            daoStorage().getFirstProposalVersion,
            daoStorage().getLastProposalVersion,
            daoStorage().getNextProposalVersion,
            daoStorage().getPreviousProposalVersion,
            _from_start
        );
    }
}




/**
  @title Indexed Address IteratorStorage
  @author DigixGlobal Pte Ltd
  @notice This contract utilizes: [Doubly Linked List](/DoublyLinkedList)
*/
contract IndexedAddressIteratorStorage {

  using DoublyLinkedList for DoublyLinkedList.IndexedAddress;
  /**
    @notice Reads the first item from an Indexed Address Doubly Linked List
    @param _list The source list
    @param _collection_index Index of the Collection to evaluate
    @return {"_item" : "First item on the list"}
  */
  function read_first_from_indexed_addresses(DoublyLinkedList.IndexedAddress storage _list, bytes32 _collection_index)
           internal
           constant
           returns (address _item)
  {
    _item = _list.start_item(_collection_index);
  }

  /**
    @notice Reads the last item from an Indexed Address Doubly Linked list
    @param _list The source list
    @param _collection_index Index of the Collection to evaluate
    @return {"_item" : "First item on the list"}
  */
  function read_last_from_indexed_addresses(DoublyLinkedList.IndexedAddress storage _list, bytes32 _collection_index)
           internal
           constant
           returns (address _item)
  {
    _item = _list.end_item(_collection_index);
  }

  /**
    @notice Reads the next item from an Indexed Address Doubly Linked List based on the specified `_current_item`
    @param _list The source list
    @param _collection_index Index of the Collection to evaluate
    @param _current_item The current item to use as base line
    @return {"_item": "The next item on the list"}
  */
  function read_next_from_indexed_addresses(DoublyLinkedList.IndexedAddress storage _list, bytes32 _collection_index, address _current_item)
           internal
           constant
           returns (address _item)
  {
    _item = _list.next_item(_collection_index, _current_item);
  }

  /**
    @notice Reads the previous item from an Index Address Doubly Linked List based on the specified `_current_item`
    @param _list The source list
    @param _collection_index Index of the Collection to evaluate
    @param _current_item The current item to use as base line
    @return {"_item" : "The previous item on the list"}
  */
  function read_previous_from_indexed_addresses(DoublyLinkedList.IndexedAddress storage _list, bytes32 _collection_index, address _current_item)
           internal
           constant
           returns (address _item)
  {
    _item = _list.previous_item(_collection_index, _current_item);
  }


  /**
    @notice Reads the total number of items in an Indexed Address Doubly Linked List
    @param _list  The source list
    @param _collection_index Index of the Collection to evaluate
    @return {"_count": "Length of the Doubly Linked list"}
  */
  function read_total_indexed_addresses(DoublyLinkedList.IndexedAddress storage _list, bytes32 _collection_index)
           internal
           constant
           returns (uint256 _count)
  {
    _count = _list.total(_collection_index);
  }

}




/**
  @title Uint Iterator Storage
  @author DigixGlobal Pte Ltd
*/
contract UintIteratorStorage {

  using DoublyLinkedList for DoublyLinkedList.Uint;

  /**
    @notice Returns the first item from a `DoublyLinkedList.Uint` list
    @param _list The DoublyLinkedList.Uint list
    @return {"_item": "The first item"}
  */
  function read_first_from_uints(DoublyLinkedList.Uint storage _list)
           internal
           constant
           returns (uint256 _item)
  {
    _item = _list.start_item();
  }

  /**
    @notice Returns the last item from a `DoublyLinkedList.Uint` list
    @param _list The DoublyLinkedList.Uint list
    @return {"_item": "The last item"}
  */
  function read_last_from_uints(DoublyLinkedList.Uint storage _list)
           internal
           constant
           returns (uint256 _item)
  {
    _item = _list.end_item();
  }

  /**
    @notice Returns the next item from a `DoublyLinkedList.Uint` list based on the specified `_current_item`
    @param _list The DoublyLinkedList.Uint list
    @param _current_item The current item
    @return {"_item": "The next item"}
  */
  function read_next_from_uints(DoublyLinkedList.Uint storage _list, uint256 _current_item)
           internal
           constant
           returns (uint256 _item)
  {
    _item = _list.next_item(_current_item);
  }

  /**
    @notice Returns the previous item from a `DoublyLinkedList.Uint` list based on the specified `_current_item`
    @param _list The DoublyLinkedList.Uint list
    @param _current_item The current item
    @return {"_item": "The previous item"}
  */
  function read_previous_from_uints(DoublyLinkedList.Uint storage _list, uint256 _current_item)
           internal
           constant
           returns (uint256 _item)
  {
    _item = _list.previous_item(_current_item);
  }

  /**
    @notice Returns the total count of itemsfrom a `DoublyLinkedList.Uint` list
    @param _list The DoublyLinkedList.Uint list
    @return {"_count": "The total count of items"}
  */
  function read_total_uints(DoublyLinkedList.Uint storage _list)
           internal
           constant
           returns (uint256 _count)
  {
    _count = _list.total();
  }

}





/**
@title Directory Storage contains information of a directory
@author DigixGlobal
*/
contract DirectoryStorage is IndexedAddressIteratorStorage, UintIteratorStorage {

  using DoublyLinkedList for DoublyLinkedList.IndexedAddress;
  using DoublyLinkedList for DoublyLinkedList.Uint;

  struct User {
    bytes32 document;
    bool active;
  }

  struct Group {
    bytes32 name;
    bytes32 document;
    uint256 role_id;
    mapping(address => User) members_by_address;
  }

  struct System {
    DoublyLinkedList.Uint groups;
    DoublyLinkedList.IndexedAddress groups_collection;
    mapping (uint256 => Group) groups_by_id;
    mapping (address => uint256) group_ids_by_address;
    mapping (uint256 => bytes32) roles_by_id;
    bool initialized;
    uint256 total_groups;
  }

  System system;

  /**
  @notice Initializes directory settings
  @return _success If directory initialization is successful
  */
  function initialize_directory()
           internal
           returns (bool _success)
  {
    require(system.initialized == false);
    system.total_groups = 0;
    system.initialized = true;
    internal_create_role(1, "root");
    internal_create_group(1, "root", "");
    _success = internal_update_add_user_to_group(1, tx.origin, "");
  }

  /**
  @notice Creates a new role with the given information
  @param _role_id Id of the new role
  @param _name Name of the new role
  @return {"_success": "If creation of new role is successful"}
  */
  function internal_create_role(uint256 _role_id, bytes32 _name)
           internal
           returns (bool _success)
  {
    require(_role_id > 0);
    require(_name != bytes32(0x0));
    system.roles_by_id[_role_id] = _name;
    _success = true;
  }

  /**
  @notice Returns the role's name of a role id
  @param _role_id Id of the role
  @return {"_name": "Name of the role"}
  */
  function read_role(uint256 _role_id)
           public
           constant
           returns (bytes32 _name)
  {
    _name = system.roles_by_id[_role_id];
  }

  /**
  @notice Creates a new group with the given information
  @param _role_id Role id of the new group
  @param _name Name of the new group
  @param _document Document of the new group
  @return {
    "_success": "If creation of the new group is successful",
    "_group_id: "Id of the new group"
  }
  */
  function internal_create_group(uint256 _role_id, bytes32 _name, bytes32 _document)
           internal
           returns (bool _success, uint256 _group_id)
  {
    require(_role_id > 0);
    require(read_role(_role_id) != bytes32(0x0));
    _group_id = ++system.total_groups;
    system.groups.append(_group_id);
    system.groups_by_id[_group_id].role_id = _role_id;
    system.groups_by_id[_group_id].name = _name;
    system.groups_by_id[_group_id].document = _document;
    _success = true;
  }

  /**
  @notice Returns the group's information
  @param _group_id Id of the group
  @return {
    "_role_id": "Role id of the group",
    "_name: "Name of the group",
    "_document: "Document of the group"
  }
  */
  function read_group(uint256 _group_id)
           public
           constant
           returns (uint256 _role_id, bytes32 _name, bytes32 _document, uint256 _members_count)
  {
    if (system.groups.valid_item(_group_id)) {
      _role_id = system.groups_by_id[_group_id].role_id;
      _name = system.groups_by_id[_group_id].name;
      _document = system.groups_by_id[_group_id].document;
      _members_count = read_total_indexed_addresses(system.groups_collection, bytes32(_group_id));
    } else {
      _role_id = 0;
      _name = "invalid";
      _document = "";
      _members_count = 0;
    }
  }

  /**
  @notice Adds new user with the given information to a group
  @param _group_id Id of the group
  @param _user Address of the new user
  @param _document Information of the new user
  @return {"_success": "If adding new user to a group is successful"}
  */
  function internal_update_add_user_to_group(uint256 _group_id, address _user, bytes32 _document)
           internal
           returns (bool _success)
  {
    if (system.groups_by_id[_group_id].members_by_address[_user].active == false && system.group_ids_by_address[_user] == 0 && system.groups_by_id[_group_id].role_id != 0) {

      system.groups_by_id[_group_id].members_by_address[_user].active = true;
      system.group_ids_by_address[_user] = _group_id;
      system.groups_collection.append(bytes32(_group_id), _user);
      system.groups_by_id[_group_id].members_by_address[_user].document = _document;
      _success = true;
    } else {
      _success = false;
    }
  }

  /**
  @notice Removes user from its group
  @param _user Address of the user
  @return {"_success": "If removing of user is successful"}
  */
  function internal_destroy_group_user(address _user)
           internal
           returns (bool _success)
  {
    uint256 _group_id = system.group_ids_by_address[_user];
    if ((_group_id == 1) && (system.groups_collection.total(bytes32(_group_id)) == 1)) {
      _success = false;
    } else {
      system.groups_by_id[_group_id].members_by_address[_user].active = false;
      system.group_ids_by_address[_user] = 0;
      delete system.groups_by_id[_group_id].members_by_address[_user];
      _success = system.groups_collection.remove_item(bytes32(_group_id), _user);
    }
  }

  /**
  @notice Returns the role id of a user
  @param _user Address of a user
  @return {"_role_id": "Role id of the user"}
  */
  function read_user_role_id(address _user)
           constant
           public
           returns (uint256 _role_id)
  {
    uint256 _group_id = system.group_ids_by_address[_user];
    _role_id = system.groups_by_id[_group_id].role_id;
  }

  /**
  @notice Returns the user's information
  @param _user Address of the user
  @return {
    "_group_id": "Group id of the user",
    "_role_id": "Role id of the user",
    "_document": "Information of the user"
  }
  */
  function read_user(address _user)
           public
           constant
           returns (uint256 _group_id, uint256 _role_id, bytes32 _document)
  {
    _group_id = system.group_ids_by_address[_user];
    _role_id = system.groups_by_id[_group_id].role_id;
    _document = system.groups_by_id[_group_id].members_by_address[_user].document;
  }

  /**
  @notice Returns the id of the first group
  @return {"_group_id": "Id of the first group"}
  */
  function read_first_group()
           view
           external
           returns (uint256 _group_id)
  {
    _group_id = read_first_from_uints(system.groups);
  }

  /**
  @notice Returns the id of the last group
  @return {"_group_id": "Id of the last group"}
  */
  function read_last_group()
           view
           external
           returns (uint256 _group_id)
  {
    _group_id = read_last_from_uints(system.groups);
  }

  /**
  @notice Returns the id of the previous group depending on the given current group
  @param _current_group_id Id of the current group
  @return {"_group_id": "Id of the previous group"}
  */
  function read_previous_group_from_group(uint256 _current_group_id)
           view
           external
           returns (uint256 _group_id)
  {
    _group_id = read_previous_from_uints(system.groups, _current_group_id);
  }

  /**
  @notice Returns the id of the next group depending on the given current group
  @param _current_group_id Id of the current group
  @return {"_group_id": "Id of the next group"}
  */
  function read_next_group_from_group(uint256 _current_group_id)
           view
           external
           returns (uint256 _group_id)
  {
    _group_id = read_next_from_uints(system.groups, _current_group_id);
  }

  /**
  @notice Returns the total number of groups
  @return {"_total_groups": "Total number of groups"}
  */
  function read_total_groups()
           view
           external
           returns (uint256 _total_groups)
  {
    _total_groups = read_total_uints(system.groups);
  }

  /**
  @notice Returns the first user of a group
  @param _group_id Id of the group
  @return {"_user": "Address of the user"}
  */
  function read_first_user_in_group(bytes32 _group_id)
           view
           external
           returns (address _user)
  {
    _user = read_first_from_indexed_addresses(system.groups_collection, bytes32(_group_id));
  }

  /**
  @notice Returns the last user of a group
  @param _group_id Id of the group
  @return {"_user": "Address of the user"}
  */
  function read_last_user_in_group(bytes32 _group_id)
           view
           external
           returns (address _user)
  {
    _user = read_last_from_indexed_addresses(system.groups_collection, bytes32(_group_id));
  }

  /**
  @notice Returns the next user of a group depending on the given current user
  @param _group_id Id of the group
  @param _current_user Address of the current user
  @return {"_user": "Address of the next user"}
  */
  function read_next_user_in_group(bytes32 _group_id, address _current_user)
           view
           external
           returns (address _user)
  {
    _user = read_next_from_indexed_addresses(system.groups_collection, bytes32(_group_id), _current_user);
  }

  /**
  @notice Returns the previous user of a group depending on the given current user
  @param _group_id Id of the group
  @param _current_user Address of the current user
  @return {"_user": "Address of the last user"}
  */
  function read_previous_user_in_group(bytes32 _group_id, address _current_user)
           view
           external
           returns (address _user)
  {
    _user = read_previous_from_indexed_addresses(system.groups_collection, bytes32(_group_id), _current_user);
  }

  /**
  @notice Returns the total number of users of a group
  @param _group_id Id of the group
  @return {"_total_users": "Total number of users"}
  */
  function read_total_users_in_group(bytes32 _group_id)
           view
           external
           returns (uint256 _total_users)
  {
    _total_users = read_total_indexed_addresses(system.groups_collection, bytes32(_group_id));
  }
}






//done
contract DaoIdentityStorage is ResolverClient, DaoConstants, DirectoryStorage {
    struct KycDetails {
        bytes32 doc;
        uint256 id_expiration;
    }

    mapping (address => KycDetails) kycInfo;

    constructor(address _resolver)
        public
    {
        require(init(CONTRACT_STORAGE_DAO_IDENTITY, _resolver));
        require(initialize_directory());
    }

    function create_group(uint256 _role_id, bytes32 _name, bytes32 _document)
        public
        returns (bool _success, uint256 _group_id)
    {
        require(sender_is(CONTRACT_DAO_IDENTITY));
        (_success, _group_id) = internal_create_group(_role_id, _name, _document);
        require(_success);
    }

    function create_role(uint256 _role_id, bytes32 _name)
        public
        returns (bool _success)
    {
        require(sender_is(CONTRACT_DAO_IDENTITY));
        _success = internal_create_role(_role_id, _name);
        require(_success);
    }

    function update_add_user_to_group(uint256 _group_id, address _user, bytes32 _document)
        public
        returns (bool _success)
    {
        require(sender_is(CONTRACT_DAO_IDENTITY));
        _success = internal_update_add_user_to_group(_group_id, _user, _document);
        require(_success);
    }

    function update_remove_group_user(address _user)
        public
        returns (bool _success)
    {
        require(sender_is(CONTRACT_DAO_IDENTITY));
        _success = internal_destroy_group_user(_user);
        require(_success);
    }

    function update_kyc(address _user, bytes32 _doc, uint256 _id_expiration)
        public
    {
        require(sender_is(CONTRACT_DAO_IDENTITY));
        kycInfo[_user].doc = _doc;
        kycInfo[_user].id_expiration = _id_expiration;
    }

    function read_kyc_info(address _user)
        public
        constant
        returns (bytes32 _doc, uint256 _id_expiration)
    {
        _doc = kycInfo[_user].doc;
        _id_expiration = kycInfo[_user].id_expiration;
    }

    function is_kyc_approved(address _user)
        public
        constant
        returns (bool _approved)
    {
        uint256 _id_expiration;
        (,_id_expiration) = read_kyc_info(_user);
        _approved = _id_expiration > now;
    }
}






// done
contract IdentityCommon is ResolverClient, DaoConstants {

  modifier if_root() {
    require(identity_storage().read_user_role_id(msg.sender) == ROLES_ROOT);
    _;
  }

  modifier if_founder() {
    require(is_founder());
    _;
  }

  function is_founder()
      internal
      constant
      returns (bool _isFounder)
  {
      _isFounder = identity_storage().read_user_role_id(msg.sender) == ROLES_FOUNDERS;
  }

  modifier if_prl() {
    require(identity_storage().read_user_role_id(msg.sender) == ROLES_PRLS);
    _;
  }

  modifier if_kyc_admin() {
    require(identity_storage().read_user_role_id(msg.sender) == ROLES_KYC_ADMINS);
    _;
  }

  function identity_storage()
    internal
    constant
    returns (DaoIdentityStorage _contract)
  {
    _contract = DaoIdentityStorage(get_contract(CONTRACT_STORAGE_DAO_IDENTITY));
  }
}





contract DaoConfigsStorage is ResolverClient, DaoConstants {
    mapping (bytes32 => uint256) public uintConfigs;
    mapping (bytes32 => address) public addressConfigs;
    mapping (bytes32 => bytes32) public bytesConfigs;

    constructor(address _resolver)
        public
    {
        require(init(CONTRACT_STORAGE_DAO_CONFIG, _resolver));

        uintConfigs[CONFIG_LOCKING_PHASE_DURATION] = 10 days;
        uintConfigs[CONFIG_QUARTER_DURATION] = QUARTER_DURATION;
        uintConfigs[CONFIG_VOTING_COMMIT_PHASE] = 3 weeks;
        uintConfigs[CONFIG_VOTING_PHASE_TOTAL] = 4 weeks;
        uintConfigs[CONFIG_INTERIM_COMMIT_PHASE] = 7 days;
        uintConfigs[CONFIG_INTERIM_PHASE_TOTAL] = 10 days;

        uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR] = 20;
        uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR] = 100;
        uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR] = 60;
        uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR] = 100;

        uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR] = 20;
        uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR] = 100;
        uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR] = 60;
        uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR] = 100;

        uintConfigs[CONFIG_DRAFT_QUOTA_NUMERATOR] = 30;
        uintConfigs[CONFIG_DRAFT_QUOTA_DENOMINATOR] = 100;
        uintConfigs[CONFIG_VOTING_QUOTA_NUMERATOR] = 30;
        uintConfigs[CONFIG_VOTING_QUOTA_DENOMINATOR] = 100;

        uintConfigs[CONFIG_QUARTER_POINT_DRAFT_VOTE] = 1;
        uintConfigs[CONFIG_QUARTER_POINT_VOTE] = 1;
        uintConfigs[CONFIG_QUARTER_POINT_INTERIM_VOTE] = 1;
        uintConfigs[CONFIG_QUARTER_POINT_CLAIM_RESULT] = 1; // TODO: remove this config
        uintConfigs[CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH] = 3;

        uintConfigs[CONFIG_BONUS_REPUTATION_NUMERATOR] = 200;
        uintConfigs[CONFIG_BONUS_REPUTATION_DENOMINATOR] = 100;

        uintConfigs[CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE] = 3 weeks;
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL] = 4 weeks;

        uintConfigs[CONFIG_SPECIAL_QUOTA_NUMERATOR] = 51;
        uintConfigs[CONFIG_SPECIAL_QUOTA_DENOMINATOR] = 100;
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR] = 70;
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR] = 100;

        uintConfigs[CONFIG_MAXIMUM_REPUTATION_DEDUCTION] = 20;
        uintConfigs[CONFIG_PUNISHMENT_FOR_NOT_LOCKING] = 5;
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_NUM] = 1; // 1 extra QP gains 1/1 RP
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_DEN] = 1;

        uintConfigs[CONFIG_MINIMAL_QUARTER_POINT] = 3;
        uintConfigs[CONFIG_QUARTER_POINT_SCALING_FACTOR] = 10;
        uintConfigs[CONFIG_REPUTATION_POINT_SCALING_FACTOR] = 10;

        uintConfigs[CONFIG_MODERATOR_MINIMAL_QUARTER_POINT] = 3;
        uintConfigs[CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR] = 10;
        uintConfigs[CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR] = 10;

        uintConfigs[CONFIG_PORTION_TO_MODERATORS_NUM] = 5; //5% of DGX to Badge holder voting activity
        uintConfigs[CONFIG_PORTION_TO_MODERATORS_DEN] = 100;

        uintConfigs[CONFIG_DRAFT_VOTING_PHASE] = 2 weeks;
        uintConfigs[CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE] = 1000;

        uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_NUMERATOR] = 30;
        uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_DENOMINATOR] = 100;

        uintConfigs[CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION] = 20;
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM] = 1;
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN] = 1;

        uintConfigs[CONFIG_VOTE_CLAIMING_DEADLINE] = 5 days;

        uintConfigs[CONFIG_MINIMUM_LOCKED_DGD] = 10 ** 9;
        uintConfigs[CONFIG_MINIMUM_DGD_FOR_MODERATOR] = 100 * (10 ** 9);
        uintConfigs[CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR] = 100;

        uintConfigs[CONFIG_PREPROPOSAL_DEPOSIT] = 2 ether;

        uintConfigs[CONFIG_MAX_FUNDING_FOR_NON_DIGIX] = 20 ether;
        uintConfigs[CONFIG_MAX_MILESTONES_FOR_NON_DIGIX] = 2;
        uintConfigs[CONFIG_NON_DIGIX_PROPOSAL_CAP_PER_QUARTER] = 10;

        uintConfigs[CONFIG_PROPOSAL_DEAD_DURATION] = 180 days;

        uintConfigs[CONFIG_CARBON_VOTE_REPUTATION_BONUS] = 250;
    }

    function updateUintConfigs(uint256[] _uintConfigs)
        public
    {
        require(sender_is(CONTRACT_DAO_SPECIAL_VOTING_CLAIMS));
        uintConfigs[CONFIG_LOCKING_PHASE_DURATION] = _uintConfigs[0];
        /*
        This used to be a config that can be changed. Now, _uintConfigs[1] is just a dummy config that doesnt do anything
        uintConfigs[CONFIG_QUARTER_DURATION] = _uintConfigs[1];
        */
        uintConfigs[CONFIG_VOTING_COMMIT_PHASE] = _uintConfigs[2];
        uintConfigs[CONFIG_VOTING_PHASE_TOTAL] = _uintConfigs[3];
        uintConfigs[CONFIG_INTERIM_COMMIT_PHASE] = _uintConfigs[4];
        uintConfigs[CONFIG_INTERIM_PHASE_TOTAL] = _uintConfigs[5];
        uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR] = _uintConfigs[6];
        uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR] = _uintConfigs[7];
        uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR] = _uintConfigs[8];
        uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR] = _uintConfigs[9];
        uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR] = _uintConfigs[10];
        uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR] = _uintConfigs[11];
        uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR] = _uintConfigs[12];
        uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR] = _uintConfigs[13];
        uintConfigs[CONFIG_DRAFT_QUOTA_NUMERATOR] = _uintConfigs[14];
        uintConfigs[CONFIG_DRAFT_QUOTA_DENOMINATOR] = _uintConfigs[15];
        uintConfigs[CONFIG_VOTING_QUOTA_NUMERATOR] = _uintConfigs[16];
        uintConfigs[CONFIG_VOTING_QUOTA_DENOMINATOR] = _uintConfigs[17];
        uintConfigs[CONFIG_QUARTER_POINT_DRAFT_VOTE] = _uintConfigs[18];
        uintConfigs[CONFIG_QUARTER_POINT_VOTE] = _uintConfigs[19];
        uintConfigs[CONFIG_QUARTER_POINT_INTERIM_VOTE] = _uintConfigs[20];
        uintConfigs[CONFIG_MINIMAL_QUARTER_POINT] = _uintConfigs[21];
        uintConfigs[CONFIG_QUARTER_POINT_CLAIM_RESULT] = _uintConfigs[22];
        uintConfigs[CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH] = _uintConfigs[23];
        uintConfigs[CONFIG_BONUS_REPUTATION_NUMERATOR] = _uintConfigs[24];
        uintConfigs[CONFIG_BONUS_REPUTATION_DENOMINATOR] = _uintConfigs[25];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE] = _uintConfigs[26];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL] = _uintConfigs[27];
        uintConfigs[CONFIG_SPECIAL_QUOTA_NUMERATOR] = _uintConfigs[28];
        uintConfigs[CONFIG_SPECIAL_QUOTA_DENOMINATOR] = _uintConfigs[29];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR] = _uintConfigs[30];
        uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR] = _uintConfigs[31];
        uintConfigs[CONFIG_MAXIMUM_REPUTATION_DEDUCTION] = _uintConfigs[32];
        uintConfigs[CONFIG_PUNISHMENT_FOR_NOT_LOCKING] = _uintConfigs[33];
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_NUM] = _uintConfigs[34];
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_DEN] = _uintConfigs[35];
        uintConfigs[CONFIG_QUARTER_POINT_SCALING_FACTOR] = _uintConfigs[36];
        uintConfigs[CONFIG_REPUTATION_POINT_SCALING_FACTOR] = _uintConfigs[37];
        uintConfigs[CONFIG_MODERATOR_MINIMAL_QUARTER_POINT] = _uintConfigs[38];
        uintConfigs[CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR] = _uintConfigs[39];
        uintConfigs[CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR] = _uintConfigs[40];
        uintConfigs[CONFIG_PORTION_TO_MODERATORS_NUM] = _uintConfigs[41];
        uintConfigs[CONFIG_PORTION_TO_MODERATORS_DEN] = _uintConfigs[42];
        uintConfigs[CONFIG_DRAFT_VOTING_PHASE] = _uintConfigs[43];
        uintConfigs[CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE] = _uintConfigs[44];
        uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_NUMERATOR] = _uintConfigs[45];
        uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_DENOMINATOR] = _uintConfigs[46];
        uintConfigs[CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION] = _uintConfigs[47];
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM] = _uintConfigs[48];
        uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN] = _uintConfigs[49];
        uintConfigs[CONFIG_VOTE_CLAIMING_DEADLINE] = _uintConfigs[50];
        uintConfigs[CONFIG_MINIMUM_LOCKED_DGD] = _uintConfigs[51];
        uintConfigs[CONFIG_MINIMUM_DGD_FOR_MODERATOR] = _uintConfigs[52];
        uintConfigs[CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR] = _uintConfigs[53];
        uintConfigs[CONFIG_PREPROPOSAL_DEPOSIT] = _uintConfigs[54];
        uintConfigs[CONFIG_MAX_FUNDING_FOR_NON_DIGIX] = _uintConfigs[55];
        uintConfigs[CONFIG_MAX_MILESTONES_FOR_NON_DIGIX] = _uintConfigs[56];
        uintConfigs[CONFIG_NON_DIGIX_PROPOSAL_CAP_PER_QUARTER] = _uintConfigs[57];
        uintConfigs[CONFIG_PROPOSAL_DEAD_DURATION] = _uintConfigs[58];
        uintConfigs[CONFIG_CARBON_VOTE_REPUTATION_BONUS] = _uintConfigs[59];
    }

    function readUintConfigs()
        public
        constant
        returns (uint256[])
    {
        uint256[] memory _uintConfigs = new uint256[](60);
        _uintConfigs[0] = uintConfigs[CONFIG_LOCKING_PHASE_DURATION];
        _uintConfigs[1] = uintConfigs[CONFIG_QUARTER_DURATION];
        _uintConfigs[2] = uintConfigs[CONFIG_VOTING_COMMIT_PHASE];
        _uintConfigs[3] = uintConfigs[CONFIG_VOTING_PHASE_TOTAL];
        _uintConfigs[4] = uintConfigs[CONFIG_INTERIM_COMMIT_PHASE];
        _uintConfigs[5] = uintConfigs[CONFIG_INTERIM_PHASE_TOTAL];
        _uintConfigs[6] = uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR];
        _uintConfigs[7] = uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR];
        _uintConfigs[8] = uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR];
        _uintConfigs[9] = uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR];
        _uintConfigs[10] = uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR];
        _uintConfigs[11] = uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR];
        _uintConfigs[12] = uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR];
        _uintConfigs[13] = uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR];
        _uintConfigs[14] = uintConfigs[CONFIG_DRAFT_QUOTA_NUMERATOR];
        _uintConfigs[15] = uintConfigs[CONFIG_DRAFT_QUOTA_DENOMINATOR];
        _uintConfigs[16] = uintConfigs[CONFIG_VOTING_QUOTA_NUMERATOR];
        _uintConfigs[17] = uintConfigs[CONFIG_VOTING_QUOTA_DENOMINATOR];
        _uintConfigs[18] = uintConfigs[CONFIG_QUARTER_POINT_DRAFT_VOTE];
        _uintConfigs[19] = uintConfigs[CONFIG_QUARTER_POINT_VOTE];
        _uintConfigs[20] = uintConfigs[CONFIG_QUARTER_POINT_INTERIM_VOTE];
        _uintConfigs[21] = uintConfigs[CONFIG_MINIMAL_QUARTER_POINT];
        _uintConfigs[22] = uintConfigs[CONFIG_QUARTER_POINT_CLAIM_RESULT];
        _uintConfigs[23] = uintConfigs[CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH];
        _uintConfigs[24] = uintConfigs[CONFIG_BONUS_REPUTATION_NUMERATOR];
        _uintConfigs[25] = uintConfigs[CONFIG_BONUS_REPUTATION_DENOMINATOR];
        _uintConfigs[26] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE];
        _uintConfigs[27] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL];
        _uintConfigs[28] = uintConfigs[CONFIG_SPECIAL_QUOTA_NUMERATOR];
        _uintConfigs[29] = uintConfigs[CONFIG_SPECIAL_QUOTA_DENOMINATOR];
        _uintConfigs[30] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR];
        _uintConfigs[31] = uintConfigs[CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR];
        _uintConfigs[32] = uintConfigs[CONFIG_MAXIMUM_REPUTATION_DEDUCTION];
        _uintConfigs[33] = uintConfigs[CONFIG_PUNISHMENT_FOR_NOT_LOCKING];
        _uintConfigs[34] = uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_NUM];
        _uintConfigs[35] = uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_DEN];
        _uintConfigs[36] = uintConfigs[CONFIG_QUARTER_POINT_SCALING_FACTOR];
        _uintConfigs[37] = uintConfigs[CONFIG_REPUTATION_POINT_SCALING_FACTOR];
        _uintConfigs[38] = uintConfigs[CONFIG_MODERATOR_MINIMAL_QUARTER_POINT];
        _uintConfigs[39] = uintConfigs[CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR];
        _uintConfigs[40] = uintConfigs[CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR];
        _uintConfigs[41] = uintConfigs[CONFIG_PORTION_TO_MODERATORS_NUM];
        _uintConfigs[42] = uintConfigs[CONFIG_PORTION_TO_MODERATORS_DEN];
        _uintConfigs[43] = uintConfigs[CONFIG_DRAFT_VOTING_PHASE];
        _uintConfigs[44] = uintConfigs[CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE];
        _uintConfigs[45] = uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_NUMERATOR];
        _uintConfigs[46] = uintConfigs[CONFIG_FINAL_REWARD_SCALING_FACTOR_DENOMINATOR];
        _uintConfigs[47] = uintConfigs[CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION];
        _uintConfigs[48] = uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM];
        _uintConfigs[49] = uintConfigs[CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN];
        _uintConfigs[50] = uintConfigs[CONFIG_VOTE_CLAIMING_DEADLINE];
        _uintConfigs[51] = uintConfigs[CONFIG_MINIMUM_LOCKED_DGD];
        _uintConfigs[52] = uintConfigs[CONFIG_MINIMUM_DGD_FOR_MODERATOR];
        _uintConfigs[53] = uintConfigs[CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR];
        _uintConfigs[54] = uintConfigs[CONFIG_PREPROPOSAL_DEPOSIT];
        _uintConfigs[55] = uintConfigs[CONFIG_MAX_FUNDING_FOR_NON_DIGIX];
        _uintConfigs[56] = uintConfigs[CONFIG_MAX_MILESTONES_FOR_NON_DIGIX];
        _uintConfigs[57] = uintConfigs[CONFIG_NON_DIGIX_PROPOSAL_CAP_PER_QUARTER];
        _uintConfigs[58] = uintConfigs[CONFIG_PROPOSAL_DEAD_DURATION];
        _uintConfigs[59] = uintConfigs[CONFIG_CARBON_VOTE_REPUTATION_BONUS];
        return _uintConfigs;
    }
}





contract DaoUpgradeStorage is ResolverClient, DaoConstants {

    uint256 public startOfFirstQuarter;
    bool public isReplacedByNewDao;
    address public newDaoContract;
    address public newDaoFundingManager;
    address public newDaoRewardsManager;

    constructor(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_UPGRADE, _resolver));
    }

    function setStartOfFirstQuarter(uint256 _start)
        public
    {
        require(sender_is(CONTRACT_DAO));
        startOfFirstQuarter = _start;
    }

    function setNewContractAddresses(
        address _newDaoContract,
        address _newDaoFundingManager,
        address _newDaoRewardsManager
    )
        public
    {
        require(sender_is(CONTRACT_DAO));
        newDaoContract = _newDaoContract;
        newDaoFundingManager = _newDaoFundingManager;
        newDaoRewardsManager = _newDaoRewardsManager;
    }

    function updateForDaoMigration()
        public
    {
        require(sender_is(CONTRACT_DAO));
        isReplacedByNewDao = true;
    }
}







contract DaoSpecialStorage is DaoWhitelistingCommon {
    using DoublyLinkedList for DoublyLinkedList.Bytes;
    using DaoStructs for DaoStructs.SpecialProposal;
    using DaoStructs for DaoStructs.Voting;

    DoublyLinkedList.Bytes proposals;
    mapping (bytes32 => DaoStructs.SpecialProposal) proposalsById;

    constructor(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_SPECIAL, _resolver));
    }

    function addSpecialProposal(
        bytes32 _proposalId,
        address _proposer,
        uint256[] _uintConfigs,
        address[] _addressConfigs,
        bytes32[] _bytesConfigs
    )
        public
    {
        require(sender_is(CONTRACT_DAO));
        proposals.append(_proposalId);
        proposalsById[_proposalId].proposalId = _proposalId;
        proposalsById[_proposalId].proposer = _proposer;
        proposalsById[_proposalId].timeCreated = now;
        proposalsById[_proposalId].uintConfigs = _uintConfigs;
        proposalsById[_proposalId].addressConfigs = _addressConfigs;
        proposalsById[_proposalId].bytesConfigs = _bytesConfigs;
    }

    function readProposal(bytes32 _proposalId)
        public
        constant
        returns (
            bytes32 _id,
            address _proposer,
            uint256 _timeCreated,
            uint256 _timeVotingStarted
        )
    {
        _id = proposalsById[_proposalId].proposalId;
        _proposer = proposalsById[_proposalId].proposer;
        _timeCreated = proposalsById[_proposalId].timeCreated;
        _timeVotingStarted = proposalsById[_proposalId].voting.startTime;
    }

    function readProposalProposer(bytes32 _proposalId)
        public
        constant
        returns (address _proposer)
    {
        _proposer = proposalsById[_proposalId].proposer;
    }

    function readConfigs(bytes32 _proposalId)
        public
        constant
        returns (
            uint256[] memory _uintConfigs,
            address[] memory _addressConfigs,
            bytes32[] memory _bytesConfigs
        )
    {
        _uintConfigs = proposalsById[_proposalId].uintConfigs;
        _addressConfigs = proposalsById[_proposalId].addressConfigs;
        _bytesConfigs = proposalsById[_proposalId].bytesConfigs;
    }

    function readVotingCount(bytes32 _proposalId, address[] _allUsers)
        public
        constant
        returns (uint256 _for, uint256 _against)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].voting.countVotes(_allUsers);
    }

    function readVotingTime(bytes32 _proposalId)
        public
        constant
        returns (uint256 _start)
    {
        require(isWhitelisted(msg.sender));
        _start = proposalsById[_proposalId].voting.startTime;
    }

    function commitVote(
        bytes32 _proposalId,
        bytes32 _hash,
        address _voter
    )
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING));
        proposalsById[_proposalId].voting.commits[_voter] = _hash;
    }

    function readComittedVote(bytes32 _proposalId, address _voter)
        public
        constant
        returns (bytes32 _commitHash)
    {
        require(isWhitelisted(msg.sender));
        _commitHash = proposalsById[_proposalId].voting.commits[_voter];
    }

    function setVotingTime(bytes32 _proposalId, uint256 _time)
        public
    {
        require(sender_is(CONTRACT_DAO));
        proposalsById[_proposalId].voting.startTime = _time;
    }

    function readVotingResult(bytes32 _proposalId)
        public
        constant
        returns (bool _result)
    {
        require(isWhitelisted(msg.sender));
        _result = proposalsById[_proposalId].voting.passed;
    }

    function setPass(bytes32 _proposalId, bool _result)
        public
    {
        require(sender_is(CONTRACT_DAO_SPECIAL_VOTING_CLAIMS));
        proposalsById[_proposalId].voting.passed = _result;
    }

    function setVotingClaim(bytes32 _proposalId, bool _claimed)
        public
    {
        require(sender_is(CONTRACT_DAO_SPECIAL_VOTING_CLAIMS));
        DaoStructs.SpecialProposal storage _proposal = proposalsById[_proposalId];
        _proposal.voting.claimed = _claimed;
    }

    function isClaimed(bytes32 _proposalId)
        public
        constant
        returns (bool _claimed)
    {
        require(isWhitelisted(msg.sender));
        _claimed = proposalsById[_proposalId].voting.claimed;
    }

    function readVote(bytes32 _proposalId, address _voter)
        public
        constant
        returns (bool _vote, uint256 _weight)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].voting.readVote(_voter);
    }

    function revealVote(
        bytes32 _proposalId,
        address _voter,
        bool _vote,
        uint256 _weight
    )
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING));
        proposalsById[_proposalId].voting.revealVote(_voter, _vote, _weight);
    }
}





contract DaoPointsStorage is ResolverClient, DaoConstants {

    struct Token {
        mapping (address => uint256) balance;
        uint256 totalSupply;
    }
    Token reputationPoint;
    mapping (uint256 => Token) quarterPoint;
    mapping (uint256 => Token) quarterModeratorPoint;

    constructor(address _resolver)
        public
    {
        require(init(CONTRACT_STORAGE_DAO_POINTS, _resolver));
    }

    /// @notice add quarter points for a _participant for a _quarterId
    function addQuarterPoint(address _participant, uint256 _point, uint256 _quarterId)
        public
        returns (uint256 _newPoint, uint256 _newTotalPoint)
    {
        require(sender_is_from([CONTRACT_DAO_VOTING, CONTRACT_DAO_VOTING_CLAIMS, EMPTY_BYTES]));
        quarterPoint[_quarterId].totalSupply = quarterPoint[_quarterId].totalSupply.add(_point);
        quarterPoint[_quarterId].balance[_participant] = quarterPoint[_quarterId].balance[_participant].add(_point);

        _newPoint = quarterPoint[_quarterId].balance[_participant];
        _newTotalPoint = quarterPoint[_quarterId].totalSupply;
    }

    function addModeratorQuarterPoint(address _participant, uint256 _point, uint256 _quarterId)
        public
        returns (uint256 _newPoint, uint256 _newTotalPoint)
    {
        require(sender_is_from([CONTRACT_DAO_VOTING, CONTRACT_DAO_VOTING_CLAIMS, EMPTY_BYTES]));
        quarterModeratorPoint[_quarterId].totalSupply = quarterModeratorPoint[_quarterId].totalSupply.add(_point);
        quarterModeratorPoint[_quarterId].balance[_participant] = quarterModeratorPoint[_quarterId].balance[_participant].add(_point);

        _newPoint = quarterModeratorPoint[_quarterId].balance[_participant];
        _newTotalPoint = quarterModeratorPoint[_quarterId].totalSupply;
    }

    /// @notice get quarter points for a _participant in a _quarterId
    function getQuarterPoint(address _participant, uint256 _quarterId)
        public
        view
        returns (uint256 _point)
    {
        _point = quarterPoint[_quarterId].balance[_participant];
    }

    function getQuarterModeratorPoint(address _participant, uint256 _quarterId)
        public
        view
        returns (uint256 _point)
    {
        _point = quarterModeratorPoint[_quarterId].balance[_participant];
    }

    /// @notice get total quarter points for a particular _quarterId
    function getTotalQuarterPoint(uint256 _quarterId)
        public
        view
        returns (uint256 _totalPoint)
    {
        _totalPoint = quarterPoint[_quarterId].totalSupply;
    }

    function getTotalQuarterModeratorPoint(uint256 _quarterId)
        public
        view
        returns (uint256 _totalPoint)
    {
        _totalPoint = quarterModeratorPoint[_quarterId].totalSupply;
    }

    /// @notice add reputation points for a _participant
    function addReputation(address _participant, uint256 _point)
        public
        returns (uint256 _newPoint, uint256 _totalPoint)
    {
        require(sender_is_from([CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_STAKE_LOCKING]));
        reputationPoint.totalSupply = reputationPoint.totalSupply.add(_point);
        reputationPoint.balance[_participant] = reputationPoint.balance[_participant].add(_point);

        _newPoint = reputationPoint.balance[_participant];
        _totalPoint = reputationPoint.totalSupply;
    }

    /// @notice subtract reputation points for a _participant
    function subtractReputation(address _participant, uint256 _point)
        public
        returns (uint256 _newPoint, uint256 _totalPoint)
    {
        require(sender_is_from([CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_REWARDS_MANAGER, EMPTY_BYTES]));
        uint256 _toDeduct = _point;
        if (reputationPoint.balance[_participant] > _point) {
            reputationPoint.balance[_participant] = reputationPoint.balance[_participant].sub(_point);
        } else {
            _toDeduct = reputationPoint.balance[_participant];
            reputationPoint.balance[_participant] = 0;
        }

        reputationPoint.totalSupply = reputationPoint.totalSupply.sub(_toDeduct);

        _newPoint = reputationPoint.balance[_participant];
        _totalPoint = reputationPoint.totalSupply;
    }

  /// @notice get reputation points for a _participant
  function getReputation(address _participant)
      public
      view
      returns (uint256 _point)
  {
      _point = reputationPoint.balance[_participant];
  }

  /// @notice get total reputation points distributed in the dao
  function getTotalReputation()
      public
      view
      returns (uint256 _totalPoint)
  {
      _totalPoint = reputationPoint.totalSupply;
  }
}





contract DaoFundingStorage is ResolverClient, DaoConstants {

    uint256 public ethInDao;

    constructor(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_FUNDING, _resolver));
    }

    function addEth(uint256 _ethAmount)
        public
    {
        require(sender_is(CONTRACT_DAO_FUNDING_MANAGER));
        ethInDao = ethInDao.add(_ethAmount);
    }

    function withdrawEth(uint256 _ethAmount)
        public
    {
        require(sender_is(CONTRACT_DAO_FUNDING_MANAGER));
        ethInDao = ethInDao.sub(_ethAmount);
    }
}






// this contract will receive DGXs fees from the DGX fees distributors
contract DaoRewardsStorage is ResolverClient, DaoConstants {
    using DaoStructs for DaoStructs.DaoQuarterInfo;

    mapping(uint256 => DaoStructs.DaoQuarterInfo) public allQuartersInfo;
    mapping(address => uint256) public claimableDGXs;
    uint256 public totalDGXsClaimed;

    mapping (address => uint256) public lastParticipatedQuarter;
    mapping (address => uint256) public previousLastParticipatedQuarter;

    mapping (address => uint256) public lastQuarterThatRewardsWasUpdated;
    mapping (address => uint256) public lastQuarterThatReputationWasUpdated;

    constructor(address _resolver)
           public
    {
        require(init(CONTRACT_STORAGE_DAO_REWARDS, _resolver));
    }

    function updateQuarterInfo(
        uint256 _quarterIndex,
        uint256 _minimalParticipationPoint,
        uint256 _quarterPointScalingFactor,
        uint256 _reputationPointScalingFactor,
        uint256 _totalEffectiveDGDPreviousQuarter,

        uint256 _moderatorMinimalQuarterPoint,
        uint256 _moderatorQuarterPointScalingFactor,
        uint256 _moderatorReputationPointScalingFactor,
        uint256 _totalEffectiveModeratorDGDLastQuarter,

        uint256 _dgxDistributionDay,
        uint256 _dgxRewardsPoolLastQuarter,
        uint256 _sumRewardsFromBeginning
    )
        public
    {
        require(sender_is(CONTRACT_DAO_REWARDS_MANAGER));
        allQuartersInfo[_quarterIndex].minimalParticipationPoint = _minimalParticipationPoint;
        allQuartersInfo[_quarterIndex].quarterPointScalingFactor = _quarterPointScalingFactor;
        allQuartersInfo[_quarterIndex].reputationPointScalingFactor = _reputationPointScalingFactor;
        allQuartersInfo[_quarterIndex].totalEffectiveDGDPreviousQuarter = _totalEffectiveDGDPreviousQuarter;

        allQuartersInfo[_quarterIndex].moderatorMinimalParticipationPoint = _moderatorMinimalQuarterPoint;
        allQuartersInfo[_quarterIndex].moderatorQuarterPointScalingFactor = _moderatorQuarterPointScalingFactor;
        allQuartersInfo[_quarterIndex].moderatorReputationPointScalingFactor = _moderatorReputationPointScalingFactor;
        allQuartersInfo[_quarterIndex].totalEffectiveModeratorDGDLastQuarter = _totalEffectiveModeratorDGDLastQuarter;

        allQuartersInfo[_quarterIndex].dgxDistributionDay = _dgxDistributionDay;
        allQuartersInfo[_quarterIndex].dgxRewardsPoolLastQuarter = _dgxRewardsPoolLastQuarter;
        allQuartersInfo[_quarterIndex].sumRewardsFromBeginning = _sumRewardsFromBeginning;
    }

    function updateClaimableDGX(address _user, uint256 _newClaimableDGX)
        public
    {
        require(sender_is(CONTRACT_DAO_REWARDS_MANAGER));
        claimableDGXs[_user] = _newClaimableDGX;
    }

    function updateLastParticipatedQuarter(address _user, uint256 _lastQuarter)
        public
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        lastParticipatedQuarter[_user] = _lastQuarter;
    }

    function updatePreviousLastParticipatedQuarter(address _user, uint256 _lastQuarter)
        public
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        previousLastParticipatedQuarter[_user] = _lastQuarter;
    }

    function updateLastQuarterThatRewardsWasUpdated(address _user, uint256 _lastQuarter)
        public
    {
        require(sender_is(CONTRACT_DAO_REWARDS_MANAGER));
        lastQuarterThatRewardsWasUpdated[_user] = _lastQuarter;
    }

    function updateLastQuarterThatReputationWasUpdated(address _user, uint256 _lastQuarter)
        public
    {
        require(sender_is(CONTRACT_DAO_REWARDS_MANAGER));
        lastQuarterThatReputationWasUpdated[_user] = _lastQuarter;
    }

    function addToTotalDgxClaimed(uint256 _dgxClaimed)
        public
    {
        require(sender_is(CONTRACT_DAO_REWARDS_MANAGER));
        totalDGXsClaimed = totalDGXsClaimed.add(_dgxClaimed);
    }

    function readQuarterInfo(uint256 _quarterIndex)
        public
        constant
        returns (
            uint256 _minimalParticipationPoint,
            uint256 _quarterPointScalingFactor,
            uint256 _reputationPointScalingFactor,
            uint256 _totalEffectiveDGDPreviousQuarter,

            uint256 _moderatorMinimalQuarterPoint,
            uint256 _moderatorQuarterPointScalingFactor,
            uint256 _moderatorReputationPointScalingFactor,
            uint256 _totalEffectiveModeratorDGDLastQuarter,

            uint256 _dgxDistributionDay,
            uint256 _dgxRewardsPoolLastQuarter,
            uint256 _sumRewardsFromBeginning
        )
    {
        _minimalParticipationPoint = allQuartersInfo[_quarterIndex].minimalParticipationPoint;
        _quarterPointScalingFactor = allQuartersInfo[_quarterIndex].quarterPointScalingFactor;
        _reputationPointScalingFactor = allQuartersInfo[_quarterIndex].reputationPointScalingFactor;
        _totalEffectiveDGDPreviousQuarter = allQuartersInfo[_quarterIndex].totalEffectiveDGDPreviousQuarter;
        _moderatorMinimalQuarterPoint = allQuartersInfo[_quarterIndex].moderatorMinimalParticipationPoint;
        _moderatorQuarterPointScalingFactor = allQuartersInfo[_quarterIndex].moderatorQuarterPointScalingFactor;
        _moderatorReputationPointScalingFactor = allQuartersInfo[_quarterIndex].moderatorReputationPointScalingFactor;
        _totalEffectiveModeratorDGDLastQuarter = allQuartersInfo[_quarterIndex].totalEffectiveModeratorDGDLastQuarter;
        _dgxDistributionDay = allQuartersInfo[_quarterIndex].dgxDistributionDay;
        _dgxRewardsPoolLastQuarter = allQuartersInfo[_quarterIndex].dgxRewardsPoolLastQuarter;
        _sumRewardsFromBeginning = allQuartersInfo[_quarterIndex].sumRewardsFromBeginning;
    }

    function readQuarterGeneralInfo(uint256 _quarterIndex)
        public
        constant
        returns (
            uint256 _dgxDistributionDay,
            uint256 _dgxRewardsPoolLastQuarter,
            uint256 _sumRewardsFromBeginning
        )
    {
        _dgxDistributionDay = allQuartersInfo[_quarterIndex].dgxDistributionDay;
        _dgxRewardsPoolLastQuarter = allQuartersInfo[_quarterIndex].dgxRewardsPoolLastQuarter;
        _sumRewardsFromBeginning = allQuartersInfo[_quarterIndex].sumRewardsFromBeginning;
    }

    function readQuarterModeratorInfo(uint256 _quarterIndex)
        public
        constant
        returns (
            uint256 _moderatorMinimalQuarterPoint,
            uint256 _moderatorQuarterPointScalingFactor,
            uint256 _moderatorReputationPointScalingFactor,
            uint256 _totalEffectiveModeratorDGDLastQuarter
        )
    {
        _moderatorMinimalQuarterPoint = allQuartersInfo[_quarterIndex].moderatorMinimalParticipationPoint;
        _moderatorQuarterPointScalingFactor = allQuartersInfo[_quarterIndex].moderatorQuarterPointScalingFactor;
        _moderatorReputationPointScalingFactor = allQuartersInfo[_quarterIndex].moderatorReputationPointScalingFactor;
        _totalEffectiveModeratorDGDLastQuarter = allQuartersInfo[_quarterIndex].totalEffectiveModeratorDGDLastQuarter;
    }

    function readQuarterParticipantInfo(uint256 _quarterIndex)
        public
        constant
        returns (
            uint256 _minimalParticipationPoint,
            uint256 _quarterPointScalingFactor,
            uint256 _reputationPointScalingFactor,
            uint256 _totalEffectiveDGDPreviousQuarter
        )
    {
        _minimalParticipationPoint = allQuartersInfo[_quarterIndex].minimalParticipationPoint;
        _quarterPointScalingFactor = allQuartersInfo[_quarterIndex].quarterPointScalingFactor;
        _reputationPointScalingFactor = allQuartersInfo[_quarterIndex].reputationPointScalingFactor;
        _totalEffectiveDGDPreviousQuarter = allQuartersInfo[_quarterIndex].totalEffectiveDGDPreviousQuarter;
    }

    function readDgxDistributionDay(uint256 _quarterIndex)
        public
        view
        returns (uint256 _distributionDay)
    {
        _distributionDay = allQuartersInfo[_quarterIndex].dgxDistributionDay;
    }

    function readTotalEffectiveDGDLastQuarter(uint256 _quarterIndex)
        public
        view
        returns (uint256 _totalEffectiveDGDPreviousQuarter)
    {
        _totalEffectiveDGDPreviousQuarter = allQuartersInfo[_quarterIndex].totalEffectiveDGDPreviousQuarter;
    }

    function readTotalEffectiveModeratorDGDLastQuarter(uint256 _quarterIndex)
        public
        view
        returns (uint256 _totalEffectiveModeratorDGDLastQuarter)
    {
        _totalEffectiveModeratorDGDLastQuarter = allQuartersInfo[_quarterIndex].totalEffectiveModeratorDGDLastQuarter;
    }

    function readRewardsPoolOfLastQuarter(uint256 _quarterIndex)
        public
        view
        returns (uint256 _rewardsPool)
    {
        _rewardsPool = allQuartersInfo[_quarterIndex].dgxRewardsPoolLastQuarter;
    }
}






contract IntermediateResultsStorage is ResolverClient, DaoConstants {
    using DaoStructs for DaoStructs.IntermediateResults;

    constructor(address _resolver) public {
        require(init(CONTRACT_STORAGE_INTERMEDIATE_RESULTS, _resolver));
    }

    mapping (bytes32 => DaoStructs.IntermediateResults) allIntermediateResults;

    function getIntermediateResults(bytes32 _key)
        public
        constant
        returns (
            address _countedUntil,
            uint256 _currentForCount,
            uint256 _currentAgainstCount,
            uint256 _currentSumOfEffectiveBalance
        )
    {
        _countedUntil = allIntermediateResults[_key].countedUntil;
        _currentForCount = allIntermediateResults[_key].currentForCount;
        _currentAgainstCount = allIntermediateResults[_key].currentAgainstCount;
        _currentSumOfEffectiveBalance = allIntermediateResults[_key].currentSumOfEffectiveBalance;
    }

    function resetIntermediateResults(bytes32 _key)
        public
    {
        require(sender_is_from([CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_SPECIAL_VOTING_CLAIMS]));
        allIntermediateResults[_key].countedUntil = address(0x0);
    }

    function setIntermediateResults(
        bytes32 _key,
        address _countedUntil,
        uint256 _currentForCount,
        uint256 _currentAgainstCount,
        uint256 _currentSumOfEffectiveBalance
    )
        public
    {
        require(sender_is_from([CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_SPECIAL_VOTING_CLAIMS]));
        allIntermediateResults[_key].countedUntil = _countedUntil;
        allIntermediateResults[_key].currentForCount = _currentForCount;
        allIntermediateResults[_key].currentAgainstCount = _currentAgainstCount;
        allIntermediateResults[_key].currentSumOfEffectiveBalance = _currentSumOfEffectiveBalance;
    }
}




library MathHelper {

  using SafeMath for uint256;

  // functions to calculate points/rewards
  function max(uint256 a, uint256 b) internal pure returns (uint256 _max){
      _max = b;
      if (a > b) {
          _max = a;
      }
  }

  function min(uint256 a, uint256 b) internal pure returns (uint256 _min){
      _min = b;
      if (a < b) {
          _min = a;
      }
  }

  function sumNumbers(uint256[] _numbers) internal pure returns (uint256 _sum) {
      for (uint256 i=0;i<_numbers.length;i++) {
          _sum = _sum.add(_numbers[i]);
      }
  }
}

















//done
contract DaoCommon is IdentityCommon {

    using MathHelper for MathHelper;

    //almostdone
    /**
    @notice Check if the DAO contracts have been replaced by a new set of contracts
    @return _isReplaced true if it is already replaced
    */
    function isDaoNotReplaced()
        internal
        constant
        returns (bool _isNotReplaced)
    {
        _isNotReplaced = !daoUpgradeStorage().isReplacedByNewDao();
    }

    //done
    /**
    @notice Check if it is currently in the locking phase
    @dev No governance activities can happen in the locking phase. The locking phase is from t=0 to t=CONFIG_LOCKING_PHASE_DURATION-1
    @return _isLockingPhase true if it is in the locking phase
    */
    function isLockingPhase()
        internal
        constant
        returns (bool _isLockingPhase)
    {
        _isLockingPhase = currentTimeInQuarter() < getUintConfig(CONFIG_LOCKING_PHASE_DURATION);
    }

    //done
    /**
    @notice Check if it is currently in a main phase.
    @dev The main phase is where all the governance activities could take plase. If the DAO is replaced, there can never be any more main phase.
    @return _isMainPhase true if it is in a main phase
    */
    function isMainPhase()
        internal
        constant
        returns (bool _isMainPhase)
    {
        _isMainPhase =
            isDaoNotReplaced() &&
            currentTimeInQuarter() >= getUintConfig(CONFIG_LOCKING_PHASE_DURATION);
    }

    //done
    /**
    @notice Check if a proposal is currently paused/stopped
    @dev If a proposal is paused/stopped (by the PRLs): proposer cannot call for voting, a current on-going voting round can still pass, but no funding can be withdrawn.
    @dev A paused proposal can still be unpaused
    @dev If a proposal is stopped, this function also returns true
    @return _isPausedOrStopped true if the proposal is paused(or stopped)
    */
    function isProposalPaused(bytes32 _proposalId)
        public
        constant
        returns (bool _isPausedOrStopped)
    {
        (,,,,,,,,_isPausedOrStopped,) = daoStorage().readProposal(_proposalId);
    }

    //done
    /**
    @notice Check if the transaction is called by the proposer of a proposal
    @return _isFromProposer true if the caller is the proposer
    */
    function isFromProposer(bytes32 _proposalId)
        internal
        constant
        returns (bool _isFromProposer)
    {
        _isFromProposer = msg.sender == daoStorage().readProposalProposer(_proposalId);
    }

    //done
    /**
    @notice Check if the proposal can still be "editted", or in other words, added more versions
    @dev Once the proposal is finalized, it can no longer be editted. The proposer will still be able to add docs and change fundings though.
    @return _isEditable true if the proposal is editable
    */
    function isEditable(bytes32 _proposalId)
        internal
        constant
        returns (bool _isEditable)
    {
        bytes32 _finalVersion;
        (,,,,,,,_finalVersion,,) = daoStorage().readProposal(_proposalId);
        _isEditable = _finalVersion == EMPTY_BYTES;
    }

    //done
    /**
    @notice Check if it is after the draft voting phase of the proposal
    */
    modifier ifAfterDraftVotingPhase(bytes32 _proposalId) {
        uint256 _start = daoStorage().readProposalDraftVotingTime(_proposalId);
        require(_start > 0); // Draft voting must have started. In other words, proposer must have finalized the proposal
        require(now >= _start + getUintConfig(CONFIG_DRAFT_VOTING_PHASE));
        _;
    }

    //done
    modifier ifCommitPhase(bytes32 _proposalId, uint8 _index) {
        requireInPhase(
            daoStorage().readProposalVotingTime(_proposalId, _index),
            0,
            getUintConfig(_index == 0 ? CONFIG_VOTING_COMMIT_PHASE : CONFIG_INTERIM_COMMIT_PHASE)
        );
        _;
    }

    //done
    modifier ifRevealPhase(bytes32 _proposalId, uint256 _index) {
      requireInPhase(
          daoStorage().readProposalVotingTime(_proposalId, _index),
          getUintConfig(_index == 0 ? CONFIG_VOTING_COMMIT_PHASE : CONFIG_INTERIM_COMMIT_PHASE),
          getUintConfig(_index == 0 ? CONFIG_VOTING_PHASE_TOTAL : CONFIG_INTERIM_PHASE_TOTAL)
      );
      _;
    }

    //done
    modifier ifAfterProposalRevealPhase(bytes32 _proposalId, uint256 _index) {
      uint256 _start = daoStorage().readProposalVotingTime(_proposalId, _index);
      require(_start > 0);
      require(now >= _start.add(getUintConfig(_index == 0 ? CONFIG_VOTING_PHASE_TOTAL : CONFIG_INTERIM_PHASE_TOTAL)));
      _;
    }

    //done
    modifier ifDraftVotingPhase(bytes32 _proposalId) {
        requireInPhase(
            daoStorage().readProposalDraftVotingTime(_proposalId),
            0,
            getUintConfig(CONFIG_DRAFT_VOTING_PHASE)
        );
        _;
    }

    //done
    modifier isProposalState(bytes32 _proposalId, bytes32 _STATE) {
        bytes32 _currentState;
        (,,,_currentState,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_currentState == _STATE);
        _;
    }

    //done
    /**
    @notice Check if the DAO has enough ETHs for a particular funding request
    */
    modifier ifFundingPossible(uint256[] _fundings, uint256 _finalReward) {
        require(MathHelper.sumNumbers(_fundings).add(_finalReward) <= daoFundingStorage().ethInDao());
        _;
    }

    //done
    modifier ifDraftNotClaimed(bytes32 _proposalId) {
        require(daoStorage().isDraftClaimed(_proposalId) == false);
        _;
    }

    //done
    modifier ifNotClaimed(bytes32 _proposalId, uint256 _index) {
        require(daoStorage().isClaimed(_proposalId, _index) == false);
        _;
    }

    //done
    modifier ifNotClaimedSpecial(bytes32 _proposalId) {
        require(daoSpecialStorage().isClaimed(_proposalId) == false);
        _;
    }

    //done
    modifier hasNotRevealed(bytes32 _proposalId, uint256 _index) {
        uint256 _voteWeight;
        (, _voteWeight) = daoStorage().readVote(_proposalId, _index, msg.sender);
        require(_voteWeight == uint(0));
        _;
    }

    //done
    modifier hasNotRevealedSpecial(bytes32 _proposalId) {
        uint256 _weight;
        (,_weight) = daoSpecialStorage().readVote(_proposalId, msg.sender);
        require(_weight == uint(0));
        _;
    }

    //done
    modifier ifAfterRevealPhaseSpecial(bytes32 _proposalId) {
      uint256 _start = daoSpecialStorage().readVotingTime(_proposalId);
      require(_start > 0);
      require(now.sub(_start) >= getUintConfig(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
      _;
    }

    //done
    modifier ifCommitPhaseSpecial(bytes32 _proposalId) {
        requireInPhase(
            daoSpecialStorage().readVotingTime(_proposalId),
            0,
            getUintConfig(CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE)
        );
        _;
    }

    //done
    modifier ifRevealPhaseSpecial(bytes32 _proposalId) {
        requireInPhase(
            daoSpecialStorage().readVotingTime(_proposalId),
            getUintConfig(CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE),
            getUintConfig(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL)
        );
        _;
    }

    //done
    modifier ifNotContract(address _address) {
        uint size;
        assembly {
            size := extcodesize(_address)
        }
        require(size == 0);
        _;
    }

    //done
    /**
    @notice Check if the calculateGlobalRewardsBeforeNewQuarter function has been done for a certain quarter
    @dev However, there is no need to run calculateGlobalRewardsBeforeNewQuarter for the first quarter
    */
    modifier ifGlobalRewardsSet(uint256 _quarterIndex) {
        if (_quarterIndex > 1) {
            require(daoRewardsStorage().readDgxDistributionDay(_quarterIndex) > 0);
        }
        _;
    }

    //done
    /**
    @notice require that it is currently during a phase, which is within _relativePhaseStart and _relativePhaseEnd seconds, after the _startingPoint
    */
    function requireInPhase(uint256 _startingPoint, uint256 _relativePhaseStart, uint256 _relativePhaseEnd)
        internal
        constant
    {
        require(_startingPoint > 0);
        require(now < _startingPoint.add(_relativePhaseEnd));
        require(now >= _startingPoint.add(_relativePhaseStart));
    }

    //done
    /**
    @notice Get the current quarter index
    @dev Quarter indexes starts from 1
    @return _quarterIndex the current quarter index
    */
    function currentQuarterIndex()
        public
        constant
        returns(uint256 _quarterIndex)
    {
        _quarterIndex = getQuarterIndex(now);
        //TODO: the QUARTER DURATION must be a fixed config and cannot be changed
    }

    //done
    /**
    @notice Get the quarter index of a timestamp
    @dev Quarter indexes starts from 1
    @return _index the quarter index
    */
    function getQuarterIndex(uint256 _time)
        internal
        constant
        returns (uint256 _index)
    {
        require(startOfFirstQuarterIsSet());
        _index =
            _time.sub(daoUpgradeStorage().startOfFirstQuarter())
            .div(getUintConfig(CONFIG_QUARTER_DURATION))
            .add(1);
        //TODO: the QUARTER DURATION must be a fixed config and cannot be changed
    }

    //done
    /**
    @notice Get the relative time in quarter of a timestamp
    @dev For example, the timeInQuarter of the first second of any quarter n-th is always 1
    @return _isMainPhase true if it's in a main phase
    */
    function timeInQuarter(uint256 _time)
        internal
        constant
        returns (uint256 _timeInQuarter)
    {
        require(startOfFirstQuarterIsSet()); // must be already set
        _timeInQuarter =
            _time.sub(daoUpgradeStorage().startOfFirstQuarter())
            % getUintConfig(CONFIG_QUARTER_DURATION);
    }

    //done
    /**
    @notice Check if the start of first quarter is already set
    @return _isSet true if start of first quarter is already set
    */
    function startOfFirstQuarterIsSet()
        internal
        constant
        returns (bool _isSet)
    {
        _isSet = daoUpgradeStorage().startOfFirstQuarter() != 0;
    }

    //done
    /**
    @notice Get the current relative time in the quarter
    @dev For example: the currentTimeInQuarter of the first second of any quarter is 1
    @return _currentT the current relative time in the quarter
    */
    function currentTimeInQuarter()
        public
        constant
        returns (uint256 _currentT)
    {
        _currentT = timeInQuarter(now);
    }

    //done
    /**
    @notice Get the time remaining in the quarter
    */
    function getTimeLeftInQuarter(uint256 _time)
        internal
        constant
        returns (uint256 _timeLeftInQuarter)
    {
        _timeLeftInQuarter = getUintConfig(CONFIG_QUARTER_DURATION).sub(timeInQuarter(_time));
        //TODO: the QUARTER DURATION must be a fixed config and cannot be changed
    }

    function daoListingService()
        internal
        constant
        returns (DaoListingService _contract)
    {
        _contract = DaoListingService(get_contract(CONTRACT_SERVICE_DAO_LISTING));
    }

    function daoConfigsStorage()
        internal
        constant
        returns (DaoConfigsStorage _contract)
    {
        _contract = DaoConfigsStorage(get_contract(CONTRACT_STORAGE_DAO_CONFIG));
    }

    function daoStakeStorage()
        internal
        constant
        returns (DaoStakeStorage _contract)
    {
        _contract = DaoStakeStorage(get_contract(CONTRACT_STORAGE_DAO_STAKE));
    }

    function daoStorage()
        internal
        constant
        returns (DaoStorage _contract)
    {
        _contract = DaoStorage(get_contract(CONTRACT_STORAGE_DAO));
    }

    function daoUpgradeStorage()
        internal
        constant
        returns (DaoUpgradeStorage _contract)
    {
        _contract = DaoUpgradeStorage(get_contract(CONTRACT_STORAGE_DAO_UPGRADE));
    }

    function daoSpecialStorage()
        internal
        constant
        returns (DaoSpecialStorage _contract)
    {
        _contract = DaoSpecialStorage(get_contract(CONTRACT_STORAGE_DAO_SPECIAL));
    }

    function daoPointsStorage()
        internal
        constant
        returns (DaoPointsStorage _contract)
    {
        _contract = DaoPointsStorage(get_contract(CONTRACT_STORAGE_DAO_POINTS));
    }

    function daoFundingStorage()
        internal
        constant
        returns (DaoFundingStorage _contract)
    {
        _contract = DaoFundingStorage(get_contract(CONTRACT_STORAGE_DAO_FUNDING));
    }

    function daoRewardsStorage()
        internal
        constant
        returns (DaoRewardsStorage _contract)
    {
        _contract = DaoRewardsStorage(get_contract(CONTRACT_STORAGE_DAO_REWARDS));
    }

    function daoWhitelistingStorage()
        internal
        constant
        returns (DaoWhitelistingStorage _contract)
    {
        _contract = DaoWhitelistingStorage(get_contract(CONTRACT_STORAGE_DAO_WHITELISTING));
    }

    function intermediateResultsStorage()
        internal
        constant
        returns (IntermediateResultsStorage _contract)
    {
        _contract = IntermediateResultsStorage(get_contract(CONTRACT_STORAGE_INTERMEDIATE_RESULTS));
    }

    function getUintConfig(bytes32 _configKey)
        public
        constant
        returns (uint256 _configValue)
    {
        _configValue = daoConfigsStorage().uintConfigs(_configKey);
    }

    function getAddressConfig(bytes32 _configKey)
        public
        constant
        returns (address _configValue)
    {
        _configValue = daoConfigsStorage().addressConfigs(_configKey);
    }

    function getBytesConfig(bytes32 _configKey)
        public
        constant
        returns (bytes32 _configValue)
    {
        _configValue = daoConfigsStorage().bytesConfigs(_configKey);
    }

    //done
    /**
    @notice Check if a user is a participant in the current quarter
    */
    function isParticipant(address _user)
        public
        constant
        returns (bool _is)
    {
        _is =
            (daoRewardsStorage().lastParticipatedQuarter(_user) == currentQuarterIndex())
            && (daoStakeStorage().lockedDGDStake(_user) >= getUintConfig(CONFIG_MINIMUM_LOCKED_DGD));
    }

    //done
    /**
    @notice Check if a user is a moderator in the current quarter
    */
    function isModerator(address _user)
        public
        constant
        returns (bool _is)
    {
        _is =
            (daoRewardsStorage().lastParticipatedQuarter(_user) == currentQuarterIndex())
            && (daoStakeStorage().lockedDGDStake(_user) >= getUintConfig(CONFIG_MINIMUM_DGD_FOR_MODERATOR))
            && (daoPointsStorage().getReputation(_user) >= getUintConfig(CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR));
    }

    //done
    /**
    @notice Calculate the start of a specific milestone of a specific proposal
    */
    function startOfMilestone(bytes32 _proposalId, uint256 _milestoneIndex)
        internal
        constant
        returns (uint256 _milestoneStart)
    {
        if (_milestoneIndex == 0) { // This is the 1st milestone, which starts after voting round 0
            _milestoneStart =
                daoStorage().readProposalVotingTime(_proposalId, 0)
                .add(getUintConfig(CONFIG_VOTING_PHASE_TOTAL));
        } else { // if its the n-th milestone, it starts after voting round n-th
            _milestoneStart =
                daoStorage().readProposalVotingTime(_proposalId, _milestoneIndex)
                .add(getUintConfig(CONFIG_INTERIM_PHASE_TOTAL));
        }
    }

    //done
    /**
    @notice Calculate the actual voting start for a voting round, given the tentative start
    @dev The tentative start is the ideal start. For example, when a proposer finish a milestone, it should be now
         However, sometimes the tentative start is too close to the end of the quarter, hence, the actual voting start should be pushed to the next quarter
    */
    function getTimelineForNextVote(
        uint256 _index,
        uint256 _tentativeVotingStart
    )
        internal
        constant
        returns (uint256 _actualVotingStart)
    {
        uint256 _timeLeftInQuarter = getTimeLeftInQuarter(_tentativeVotingStart);
        uint256 _votingDuration = getUintConfig(_index == 0 ? CONFIG_VOTING_PHASE_TOTAL : CONFIG_INTERIM_PHASE_TOTAL);
        _actualVotingStart = _tentativeVotingStart;
        if (timeInQuarter(_tentativeVotingStart) < getUintConfig(CONFIG_LOCKING_PHASE_DURATION)) { // if the tentative start is during a locking phase
            _actualVotingStart = _tentativeVotingStart.add(
                getUintConfig(CONFIG_LOCKING_PHASE_DURATION).sub(timeInQuarter(_tentativeVotingStart))
            );
        } else if (_timeLeftInQuarter < _votingDuration.add(getUintConfig(CONFIG_VOTE_CLAIMING_DEADLINE))) { // if the time left in quarter is not enough to vote and claim voting
            _actualVotingStart = _tentativeVotingStart.add(
                _timeLeftInQuarter.add(getUintConfig(CONFIG_LOCKING_PHASE_DURATION)).add(1)
            );
        }
    }

    //done
    /**
    @notice Check if we can add another non-Digix proposal in this quarter
    @dev There is a max cap to the number of non-Digix proposals CONFIG_NON_DIGIX_PROPOSAL_CAP_PER_QUARTER
    */
    function checkNonDigixProposalLimit(bytes32 _proposalId)
        internal
        constant
    {
        bool _isDigixProposal;
        (,,,,,,,,,_isDigixProposal) = daoStorage().readProposal(_proposalId);
        if (!_isDigixProposal) {
            require(daoStorage().proposalCountByQuarter(currentQuarterIndex()) < getUintConfig(CONFIG_NON_DIGIX_PROPOSAL_CAP_PER_QUARTER));
        }
    }

    //done
    /**
    @notice If its a non-Digix proposal, check if the fundings are within limit
    @dev There is a max cap to the fundings and number of milestones for non-Digix proposals
    */
    function checkNonDigixFundings(uint256[] _milestonesFundings, uint256 _finalReward)
        internal
        constant
    {
        if (!is_founder()) {
            require(MathHelper.sumNumbers(_milestonesFundings).add(_finalReward) <= getUintConfig(CONFIG_MAX_FUNDING_FOR_NON_DIGIX));
            require(_milestonesFundings.length <= getUintConfig(CONFIG_MAX_MILESTONES_FOR_NON_DIGIX));
        }
    }

    //done
    /**
    @notice Check if msg.sender can do operations as a proposer
    @dev Note that this function does not check if he is the proposer of the proposal
    */
    function senderCanDoProposerOperations()
        internal
        constant
    {
        require(isMainPhase());
        require(isParticipant(msg.sender));
        require(identity_storage().is_kyc_approved(msg.sender));
    }

}


/// @title Digix Math Library
/// @author DigixGlobal

library MathUtils {

  /*modifier if_safe_to_add(uint256 _x, uint256 _y) {
    require(is_safe_to_add(_x, _y) == true);
    _;
  }

  modifier if_safe_to_subtract(uint256 _x, uint256 _y) {
    require(is_safe_to_subtract(_x, _y) == true);
    _;
  }*/

  /*uint256 constant ONE_DAY = 1 days;*/

  /// DEPRECATED
  /// @notice Call with two integers to determine if they are safe to add
  /// @dev Catches integer overflow
  /// param _a Integer to add
  /// param _b Integer to add
  /// @return _issafe True if the integers are safe to add
  /*function is_safe_to_add(uint256 _a, uint256 _b)
           public
           constant
           returns (bool _is_safe)
  {
    _is_safe = (_a + _b >= _a);
    return _is_safe;
  }*/

  /// @notice Returns sum of two safely-added integers
  /// @dev Uses `safeToAdd` internally; throws if unsafe
  /// @param _a Integer to add
  /// @param _b Integer to add
  /// @return _result Sum of inputs
  function add(uint256 _a, uint256 _b)
           public
           pure
           returns (uint256 _result)
  {
    _result = _a + _b;
    require(_result > _a);
  }

  /// DEPRECATED
  /// @notice Call with two integers to determine if they are safe to subtract
  /// @dev Catches integer overflow
  /// param _a Integer to subtract from
  /// param _b Integer to subtract
  /// @return _issafe True if the integers are safe to subtract
  /*function is_safe_to_subtract(uint256 _a, uint256 _b)
           public
           constant
           returns (bool _is_safe)
  {
    _is_safe = (_b <= _a);
    return _is_safe;
  }*/

  /// @notice Returns result of two safely-subtracted integers
  /// @dev Uses `safeToSubtract` internally; throws if unsafe
  /// @param _a Integer to subtract from
  /// @param _b Integer to subtract
  /// @return _result Result of subtraction
  function subtract(uint256 _a, uint256 _b)
           public
           pure
           returns (uint _result)
  {
    require(_a >= _b);
    _result = _a - _b;
  }

  /// DEPRECATED
  ///# @notice Calculates the rate of ???
  ///# @dev `((_unit * _a) + _b / 2) / _b`
  ///# paramm _a ??
  ///# paramm _b ??
  ///# paramm _places Number of decimal places
  ///# @return _result Result of subtraction
  /*function rate_of(uint256 _a, uint256 _b, uint256 _places)
           public
           constant
           returns (uint256 _result)
  {
    var _unit = 10 ** _places;
    _result = add((_unit * _a), (_b / 2)) / _b;
    return _result;
  }*/

  /// DEPRECATED
  ///# @notice Calculates the rate from ???
  ///# @dev `(_amount * _baserate) / (10 ** _places)`
  ///# paramm _amount ??
  ///# paramm _baserate ??
  ///# paramm _places ??
  ///# @return _fee Calculated Fee
  /*function from_rate(uint256 _amount, uint256 _baserate, uint256 _places)
           returns (uint256 _fee)
  {
    _fee = ((_amount * _baserate) / (10 ** _places));
    return _fee;
  }*/

  /// DEPRECATED
  ///# @notice Calculate demurrage time values
  ///# paramm _current_time Current block time
  ///# paramm _last_payment_date Last demurrage payment date
  ///# @return {
  ///   "_next_payment_date": "Next payment date as unix time",
  ///   "_demurrage_days": "Demurrage days calculated"
  /// }
  /*function calculate_demurrage_time(uint256 _current_time, uint256 _last_payment_date)
           returns (uint256 _next_payment_date, uint256 _demurrage_days)
  {
    var _time_difference = subtract(_current_time, _last_payment_date);
    _demurrage_days = _time_difference / (1 days);
    var _remainder = _time_difference % (1 days);
    var _demurrage_seconds = _demurrage_days * (1 days);
    _next_payment_date = subtract(add(_last_payment_date, _demurrage_seconds), _remainder);
    return (_next_payment_date, _demurrage_days);
  }*/

  /// DEPRECATED
  ///# @notice Calculate demurrage fee
  ///# paramm _demurrage_days Days since last demurrage payment
  ///# paramm _unit_size Minimum amount for demurrage fees
  ///# paramm _fee_per_unit Amount of daily demurrage to deduct for every `_demurrage_minimum`
  ///# paramm _raw_balance Account balance
  ///# @return _demurrage_fee The demurrage fee due
  /*function calculate_demurrage_fee(uint256 _demurrage_days, uint256 _unit_size, uint256 _fee_per_unit, uint256 _raw_balance)
           returns (uint256 _demurrage_fee)
  {
    if (_demurrage_days == 0) {
      _demurrage_fee = 0;
    } else {
      var _billable_amount = (_raw_balance / _unit_size);
      _demurrage_fee = (_billable_amount * _demurrage_days * _fee_per_unit);
    }
    return _demurrage_fee;
  }*/

  /// DEPRECATED
  ///# @notice Get demurrage info
  ///# paramm _current_time Current block time
  ///# paramm _last_payment_date Last demurrage payment date
  ///# paramm _raw_balance Account balance
  ///# paramm _unit_size Minimum amount needed to charge demurrage fees
  ///# paramm _fee_per_unit The amount of daily demurrage deduct for every `_minimum_for_demurrage`
  /// @return {
  ///    "_demurrage_fee": "Fee charged against current balance",
  ///    "_demurrage_days": "Demurrage days calculated",
  ///    "_billable_amount": "Amount eligible for demurrage calculation",
  ///    "_next_payment_date": "Timestamp to use for next payment date"
  /// }
  /*function get_demurrage_info(uint256 _current_time, uint256 _last_payment_date, uint256 _raw_balance, uint256 _unit_size, uint256 _fee_per_unit)
           returns (uint256 _demurrage_fee, uint256 _demurrage_days, uint256 _balance_after, uint256 _next_payment_date)
  {
    _demurrage_days = (subtract(_current_time, _last_payment_date)) / ONE_DAY;
    uint256 _billable_amount = (_raw_balance / _unit_size);
    if (_demurrage_days == 0) {
      _demurrage_fee = 0;
      _next_payment_date = _last_payment_date;
      _balance_after = _raw_balance;
    } else {
      _demurrage_fee = (_billable_amount * _demurrage_days * _fee_per_unit);
      var _remainder = subtract(_current_time, _last_payment_date) % ONE_DAY;
      _next_payment_date = subtract(add(_last_payment_date, (_demurrage_days * ONE_DAY)), _remainder);
      _balance_after = subtract(_raw_balance, _demurrage_fee);
    }
    return (_demurrage_fee, _demurrage_days, _balance_after, _next_payment_date);
  }*/

  /// DEPRECATED
  ///# @notice Calculate Transaction Fee
  ///# paramm _sending_amount The amount being sent
  ///# paramm _unit_size The minimum amount that can be sent
  ///# paramm _fee_per_unit The fee per unit
  ///# @return _tx_fee The transaction fee due
  /*function get_tx_fee(uint256 _sending_amount, uint256 _unit_size, uint256 _fee_per_unit)
           returns (uint256 _tx_fee)
  {
    _tx_fee = (_sending_amount / _unit_size) * _fee_per_unit;
    return _tx_fee;
  }*/

  function calculate_recast_fee(uint256 _asset_weight, uint256 _unit_size, uint256 _fee_per_unit)
           public
           pure
           returns (uint256 _recast_fee)
  {
    uint256 _weight_times_fee_per_unit = _asset_weight * _fee_per_unit;
    require(_weight_times_fee_per_unit / _asset_weight == _fee_per_unit);
    _recast_fee = _weight_times_fee_per_unit / _unit_size;
    return _recast_fee;
  }

}


library Types {

  struct MutableUint {
    uint256 pre;
    uint256 post;
  }

  struct MutableTimestamp {
    MutableUint time;
    uint256 in_units;
  }

  function advance_by(MutableTimestamp memory _original, uint256 _units)
           internal
           constant
           returns (MutableTimestamp _transformed)
  {
    _transformed = _original;
    require(now >= _original.time.pre);
    uint256 _lapsed = now - _original.time.pre;
    _transformed.in_units = _lapsed / _units;
    uint256 _ticks = _transformed.in_units * _units;
    if (_transformed.in_units == 0) {
      _transformed.time.post = _original.time.pre;
    } else {
      _transformed.time = add(_transformed.time, _ticks);
    }
  }

  // DEPRECATED
  /*function add_two(MutableUint memory _original, uint256 _first, uint256 _second)
           internal
           constant
           returns (MutableUint _transformed)
  {
    require((_original.pre + _first + _second) >= _original.pre);
    _transformed = _original;
    _transformed.post = (_original.pre + _first + _second);
  }*/

  function subtract_two(MutableUint memory _original, uint256 _first, uint256 _second)
           internal
           pure
           returns (MutableUint _transformed)
  {
    require(_original.pre >= _first);
    uint256 _after_first = _original.pre - _first;
    require(_after_first >= _second);
    _transformed = _original;
    _original.post = (_after_first - _second);
  }

  function subtract_and_add(MutableUint memory _original, uint256 _to_subtract, uint256 _to_add)
           internal
           pure
           returns (MutableUint _transformed)
  {
    require(_original.pre >= _to_subtract);
    uint256 _after_subtract = _original.pre - _to_subtract;
    require((_after_subtract + _to_add) >= _after_subtract);
    _transformed.post = _after_subtract + _to_add;
  }

  /// DEPRECATED
  /*function increment(MutableUint memory _original)
           internal
           constant
           returns (MutableUint _transformed)
  {
    _transformed = _original;
    _transformed.post = _original.pre + 1;
  }*/

  /// DEPRECATED
  /*function decrement(MutableUint memory _original)
           internal
           constant
           returns (MutableUint _transformed)
  {
    _transformed = _original;
    require((_original.pre + 1) > _original.pre);
    _transformed.post = _original.pre - 1;
  }*/

  function add_and_subtract(MutableUint memory _original, uint256 _to_add, uint256 _to_subtract)
           internal
           pure
           returns (MutableUint _transformed)
  {
    require((_original.pre + _to_add) >= _original.pre);
    uint256 _after_add = _original.pre + _to_add;
    require(_after_add >= _to_subtract);
    _transformed = _original;
    _transformed.post = (_after_add - _to_subtract);
  }

  function add(MutableUint memory _original, uint256 _amount)
           internal
           pure
           returns (MutableUint _transformed)
  {
    require((_original.pre + _amount) >= _original.pre);
    _transformed = _original;
    _transformed.post = _original.pre + _amount;
  }

  function subtract(MutableUint memory _original, uint256 _amount)
           internal
           pure
           returns (MutableUint _transformed)
  {
    require(_amount <= _original.pre);
    _transformed = _original;
    _transformed.post = _original.pre - _amount;
  }

  function swap(MutableUint memory _original_a, MutableUint memory _original_b)
           internal
           pure
           returns (MutableUint _transformed_a, MutableUint _transformed_b)
  {
    _transformed_a = _original_a;
    _transformed_b = _original_b;
    _transformed_a.post = _original_b.pre;
    _transformed_b.post = _original_a.pre;
  }

  /*function transfer(MutableUint memory _original_from, MutableUint memory _original_to, uint256 _amount)
           internal
           constant
           returns (MutableUint _transformed_from, MutableUint _transformed_to)
  {
    _original_from = _transformed_from;
    _original_to = _transformed_to;
    _transformed_from.post = subtract(_transformed_from, _amount).post;
    _transformed_to.post = add(_transformed_to, _amount).post;
  }*/

}


contract TokenReceiver {
  function tokenFallback(address from, uint256 amount, bytes32 data) public returns (bool success);
}




library DemurrageStructs {
  using Types for Types.MutableUint;
  using Types for Types.MutableTimestamp;

  struct User {
    address account;
    bool no_demurrage_fee;
    Types.MutableUint balance;
    Types.MutableTimestamp payment_date;
  }

  struct Config {
    Types.MutableUint collector_balance;
    uint256 base;
    uint256 rate;
    address collector;
  }

  struct Demurrage {
    Config config;
    User user;
    uint256 collected_fee;
  }
}




library TransferStructs {
  using Types for Types.MutableUint;
  using Types for Types.MutableTimestamp;

  struct User {
    address account;
    Types.MutableUint balance;
    bool no_transfer_fee;
  }

  struct Spender {
    address account;
    Types.MutableUint allowance;
  }

  struct Config {
    Types.MutableUint collector_balance;
    address collector;
    uint256 base;
    uint256 rate;
    bool global_transfer_fee_disabled;
    uint256 minimum_transfer_amount;
  }

  struct Transfer {
    User sender;
    User recipient;
    Spender spender;
    Config config;
    Types.MutableUint received_amount;
    uint256 sent_amount;
    uint256 fee;
    bool is_transfer_from;
  }
}








contract DummyDGXStorage {
  using Types for Types.MutableUint;
  using Types for Types.MutableTimestamp;

  struct FeeConfiguration {
    uint256 base;
    uint256 rate;
  }

  struct GlobalConfig {
    bytes32 current_version;
    bool no_demurrage_fee;
    bool no_transfer_fee;
    uint256 minimum_transfer_amount;
    Fees fees;
  }

  struct Fees {
    FeeConfiguration demurrage;
    FeeConfiguration transfer;
  }

  struct Collectors {
    address demurrage;
    address transfer;
  }

  struct UserConfig {
    bool no_demurrage_fee;
    bool no_transfer_fee;
  }

  struct UserData {
    uint256 last_payment_date;
    uint256 raw_balance;
    mapping (address => uint256) spender_allowances;
  }

  struct User {
    UserConfig config;
    UserData data;
  }

  struct System {
    Collectors collectors;
    GlobalConfig config;
    uint256 total_supply;
    mapping (address => User) users;
  }

  System system;
  address ROOT;
  address DGX_INTERACTIVE_ADDRESS;

  constructor()
    public
  {
    address _demurrage_collector;
    address _transfer_collector;
    assembly {
      _demurrage_collector := create(0,0,0)
      _transfer_collector := create(0,0,0)
    }

    system.config.fees.demurrage.base = 10000000;
    system.config.fees.demurrage.rate = 165;
    system.config.fees.transfer.base = 10000;
    system.config.fees.transfer.rate = 13;
    system.config.minimum_transfer_amount = 1000000;
    system.config.no_demurrage_fee = false;
    system.config.no_transfer_fee = false;
    system.config.current_version = "1.0.0";
    system.total_supply = 0;
    ROOT = msg.sender;
  }

  function setInteractive(address _DummyDGXInteractive)
    public
    if_root()
  {
    DGX_INTERACTIVE_ADDRESS = _DummyDGXInteractive;
  }

  modifier if_root() {
    require(msg.sender == ROOT);
    _;
  }

  modifier if_dgx_interactive() {
    require(msg.sender == DGX_INTERACTIVE_ADDRESS);
    _;
  }

  /////////////////////////////// PUBLIC FUNCTIONS ////////////////////////////

  function read_demurrage_config()
    constant
    public
    returns (
      uint256 _collector_balance,
      uint256 _base,
      uint256 _rate,
      address _collector
    )
  {
    _collector_balance = system.users[system.collectors.demurrage].data.raw_balance;
    bool _global_demurrage_disabled = system.config.no_demurrage_fee;
    _collector = system.collectors.demurrage;
    if (_global_demurrage_disabled) {
      _base = 0;
      _rate = 0;
    } else {
      _base = system.config.fees.demurrage.base;
      _rate = system.config.fees.demurrage.rate;
    }
  }

  function read_demurrage_config_underlying()
    public
    constant
    returns (
      uint256 _base,
      uint256 _rate,
      address _collector,
      bool _no_demurrage_fee
    )
  {
    _base = system.config.fees.demurrage.base;
    _rate = system.config.fees.demurrage.rate;
    _collector = system.collectors.demurrage;
    _no_demurrage_fee = system.config.no_demurrage_fee;
  }

  function read_transfer_config()
    public
    constant
    returns (
      uint256 _collector_balance,
      uint256 _base,
      uint256 _rate,
      address _collector,
      bool _no_transfer_fee,
      uint256 _minimum_transfer_amount
    )
  {
    _collector_balance = system.users[system.collectors.transfer].data.raw_balance;
    _base = system.config.fees.transfer.base;
    _rate = system.config.fees.transfer.rate;
    _collector = system.collectors.transfer;
    _no_transfer_fee = system.config.no_transfer_fee;
    _minimum_transfer_amount = system.config.minimum_transfer_amount;
  }

  function read_user_for_transfer(address _account)
    public
    constant
    returns (uint256 _raw_balance, bool _no_transfer_fee)
  {
    _raw_balance = system.users[_account].data.raw_balance;
    _no_transfer_fee = system.users[_account].config.no_transfer_fee;
  }

  function read_user_for_demurrage(address _account)
    public
    constant
    returns (
      uint256 _raw_balance,
      uint256 _payment_date,
      bool _no_demurrage_fee
    )
  {
    _raw_balance = system.users[_account].data.raw_balance;
    _payment_date = system.users[_account].data.last_payment_date;
    _no_demurrage_fee = system.users[_account].config.no_demurrage_fee ||
                          system.config.no_demurrage_fee;
  }

  function read_total_supply()
    public
    constant
    returns (uint256 _totalSupply)
  {
    _totalSupply = system.total_supply;
  }

  function read_allowance(address _owner, address _spender)
    public
    constant
    returns (uint256 _allowance)
  {
    _allowance = system.users[_owner].data.spender_allowances[_spender];
  }

  function read_user_fees_configs(address _account)
    public
    constant
    returns (
      bool _no_demurrage_fee,
      bool _no_transfer_fee
    )
  {
    _no_demurrage_fee = system.users[_account].config.no_demurrage_fee;
    _no_transfer_fee = system.users[_account].config.no_transfer_fee;
  }

  ////////////////////////// CALLABLE FROM INTERACTIVE ////////////////////////

  function show_demurraged_balance(address _user)
    public
    if_dgx_interactive()
    constant
    returns (uint256 _actual_balance)
  {
    DemurrageStructs.Demurrage memory _demurrage = get_demurraged_data(_user);
    _demurrage = calculate_demurrage(_demurrage);
    _actual_balance = _demurrage.user.balance.post;
  }

  function put_transfer(
    address _sender,
    address _recipient,
    address _spender,
    uint256 _amount,
    bool _transfer_from
  )
    public
    if_dgx_interactive()
    returns (bool _success)
  {
    require(_sender != _recipient);
    require(deduct_demurrage(_sender) == true);
    require(deduct_demurrage(_recipient) == true);

    TransferStructs.Transfer memory _transfer;
    (
      _transfer.config.collector_balance.pre,
      _transfer.config.base,
      _transfer.config.rate,
      _transfer.config.collector,
      _transfer.config.global_transfer_fee_disabled,
      _transfer.config.minimum_transfer_amount
    ) = read_transfer_config();

    require(_amount >= _transfer.config.minimum_transfer_amount);

    (_transfer.sender.balance.pre, _transfer.sender.no_transfer_fee) =
      read_user_for_transfer(_sender);

    (_transfer.recipient.balance.pre, _transfer.recipient.no_transfer_fee) =
      read_user_for_transfer(_recipient);

    _transfer.sent_amount = _amount;
    _transfer.is_transfer_from = _transfer_from;

    if ((_transfer.config.global_transfer_fee_disabled == true) ||
          (_transfer.sender.no_transfer_fee == true)) {
      _transfer = build_transfer_with_no_transfer_fee(_transfer);
    } else {
      _transfer = build_transfer_with_transfer_fee(_transfer);
    }

    if (_transfer.is_transfer_from == true) {
      require(deduct_demurrage(_spender) == true);
      _transfer.spender.allowance.pre = read_allowance(_sender, _spender);
      _transfer.spender.allowance = _transfer.spender.allowance.subtract(_amount);

      _success = update_transfer_from_balance(
                   _sender,
                   _transfer.sender.balance.post,
                   _recipient,
                   _transfer.recipient.balance.post,
                   _transfer.config.collector_balance.post,
                   _spender,
                   _transfer.spender.allowance.post
                 );
    } else {
      _success = update_transfer_balance(
                   _sender,
                   _transfer.sender.balance.post,
                   _recipient,
                   _transfer.recipient.balance.post,
                   _transfer.config.collector_balance.post
                 );
    }
    require(_success);
  }

  function put_approve(
    address _account,
    address _spender,
    uint256 _amount
  )
    public
    if_dgx_interactive()
    returns (bool _success)
  {
    Types.MutableUint memory _a;

    _a.pre = read_allowance(_account, _spender);

    if ((_a.pre > 0) && (_amount > 0)) {
      revert();
    } else {
      _a.post = _amount;
      _success = update_account_spender_allowance(_account, _spender, _a.post);
    }
  }

  function update_user_fees_configs(
    address _user,
    bool _no_demurrage_fee,
    bool _no_transfer_fee
  )
    public
    if_dgx_interactive()
    returns (bool _success)
  {
    system.users[_user].config.no_demurrage_fee = _no_demurrage_fee;
    system.users[_user].config.no_transfer_fee = _no_transfer_fee;
    _success = true;
  }

  // This function is not present in the DummyDGX2.0 token contracts.
  // For test purpose, only used to bypass the POP process
  function mint_dgx_for(
    address _for,
    uint256 _amount
  )
    public
    if_dgx_interactive()
    returns (bool _success)
  {
    system.users[_for].data.raw_balance += _amount;
    system.total_supply += _amount;
    _success = true;
  }

  // This function is not present in the DummyDGX2.0 token contracts.
  // For test purpose, only used to simulate demurrage deduction
  function modify_last_payment_date(
    address _of,
    uint256 _byMinutes
  )
    public
    if_dgx_interactive()
    returns (bool _success)
  {
    system.users[_of].data.last_payment_date = now - (_byMinutes * 1 minutes);
    _success = true;
  }

  //////////////////////////// PRIVATE FUNCTIONS //////////////////////////////

  function get_demurraged_data(address _user)
    private
    constant
    returns (DemurrageStructs.Demurrage _demurrage)
  {
    (
      _demurrage.config.collector_balance.pre,
      _demurrage.config.base,
      _demurrage.config.rate,
      _demurrage.config.collector
    ) = read_demurrage_config();
    _demurrage.user.account = _user;
    (
      _demurrage.user.balance.pre,
      _demurrage.user.payment_date.time.pre,
      _demurrage.user.no_demurrage_fee
    ) = read_user_for_demurrage(_user);
  }

  function calculate_demurrage(DemurrageStructs.Demurrage memory _demurrage)
    private
    constant
    returns (DemurrageStructs.Demurrage _calculated)
  {
    if (_demurrage.user.payment_date.time.pre == 0) {
      _demurrage.user.payment_date.time.pre = now;
    }
    // demurrage collector is never deducted for demurrage
    if (_demurrage.user.no_demurrage_fee == true || _demurrage.user.account == _demurrage.config.collector) {
      _demurrage.user.balance.post = _demurrage.user.balance.pre;
      _demurrage.config.collector_balance.post = _demurrage.config.collector_balance.pre;
      _demurrage.user.payment_date.time.post = now;
    } else {
      _demurrage.user.payment_date = _demurrage.user.payment_date.advance_by(1 days);
      if (_demurrage.user.payment_date.in_units == 0) {
        _demurrage.user.balance.post = _demurrage.user.balance.pre;
        _demurrage.config.collector_balance.post = _demurrage.config.collector_balance.pre;
      } else {
        _demurrage.collected_fee = (_demurrage.user.payment_date.in_units * _demurrage.user.balance.pre * _demurrage.config.rate) / _demurrage.config.base;
        _demurrage.user.balance = _demurrage.user.balance.subtract(_demurrage.collected_fee);
        _demurrage.config.collector_balance = _demurrage.config.collector_balance.add(_demurrage.collected_fee);
      }
    }
    _calculated = _demurrage;
  }

  function deduct_demurrage(address _user)
    public
    returns (bool _success)
  {
    DemurrageStructs.Demurrage memory _demurrage = get_demurraged_data(_user);
    _demurrage = calculate_demurrage(_demurrage);
    update_user_for_demurrage(
      _demurrage.user.account,
      _demurrage.user.balance.post,
      _demurrage.user.payment_date.time.post,
      _demurrage.config.collector_balance.post
    );
    _success = true;
  }

  function update_user_for_demurrage(
    address _user,
    uint256 _user_new_balance,
    uint256 _user_new_payment_date,
    uint256 _collector_new_balance
  )
    private
  {
    system.users[system.collectors.demurrage].data.raw_balance = _collector_new_balance;
    system.users[_user].data.raw_balance = _user_new_balance;
    system.users[_user].data.last_payment_date = _user_new_payment_date;
  }

  function build_transfer_with_no_transfer_fee(TransferStructs.Transfer memory _transfer)
    private
    pure
    returns (TransferStructs.Transfer memory _built)
  {
    _transfer.fee = 0;
    _transfer.received_amount = _transfer.received_amount.add(_transfer.sent_amount);
    _transfer.sender.balance = _transfer.sender.balance.subtract(_transfer.received_amount.post);
    _transfer.config.collector_balance.post = _transfer.config.collector_balance.pre;
    _transfer.recipient.balance = _transfer.recipient.balance.add(_transfer.received_amount.post);
    _built = _transfer;
  }

  function build_transfer_with_transfer_fee(TransferStructs.Transfer memory _transfer)
    private
    pure
    returns (TransferStructs.Transfer memory _built)
  {
    _transfer.fee = (_transfer.sent_amount * _transfer.config.rate) / _transfer.config.base;
    _transfer.received_amount.pre = _transfer.sent_amount;
    _transfer.received_amount = _transfer.received_amount.subtract(_transfer.fee);
    _transfer.config.collector_balance = _transfer.config.collector_balance.add(_transfer.fee);
    _transfer.sender.balance = _transfer.sender.balance.subtract(_transfer.sent_amount);
    _transfer.recipient.balance = _transfer.recipient.balance.add(_transfer.received_amount.post);
    _built = _transfer;
  }

  function update_account_spender_allowance(
    address _account,
    address _spender,
    uint256 _new_allowance
  )
    private
    returns (bool _success)
  {
    system.users[_account].data.spender_allowances[_spender] = _new_allowance;
    _success = true;
  }

  function update_transfer_balance(
    address _sender,
    uint256 _sender_new_balance,
    address _recipient,
    uint256 _recipient_new_balance,
    uint256 _transfer_fee_collector_new_balance
  )
    private
    returns (bool _success)
  {
    system.users[_sender].data.raw_balance = _sender_new_balance;
    system.users[_recipient].data.raw_balance = _recipient_new_balance;
    system.users[system.collectors.transfer].data.raw_balance = _transfer_fee_collector_new_balance;
    _success = true;
  }

  function update_transfer_from_balance(
    address _sender,
    uint256 _sender_new_balance,
    address _recipient,
    uint256 _recipient_new_balance,
    uint256 _transfer_fee_collector_new_balance,
    address _spender,
    uint256 _spender_new_allowance
  )
    private
    returns (bool _success)
  {
    system.users[_sender].data.raw_balance = _sender_new_balance;
    system.users[_recipient].data.raw_balance = _recipient_new_balance;
    system.users[system.collectors.transfer].data.raw_balance = _transfer_fee_collector_new_balance;
    system.users[_sender].data.spender_allowances[_spender] = _spender_new_allowance;
    _success = true;
  }
}




contract DummyDGX {

  address DGX_STORAGE_ADDRESS;
  address FEES_ADMIN;

  string public constant name = "Dummy Digix Gold Token";
  string public constant symbol = "DummyDGX";
  uint8 public constant decimals = 9;

  constructor(address _dummyDGXStorage, address _feesAdmin)
    public
  {
    DGX_STORAGE_ADDRESS = _dummyDGXStorage;
    FEES_ADMIN = _feesAdmin;
  }

  modifier if_fees_admin() {
    require(msg.sender == FEES_ADMIN);
    _;
  }

  function totalSupply()
    public
    constant
    returns (uint256 _totalSupply)
  {
    _totalSupply = DummyDGXStorage(DGX_STORAGE_ADDRESS).read_total_supply();
  }

  function balanceOf(address _owner)
    public
    constant
    returns (uint256 _balance)
  {
    _balance = DummyDGXStorage(DGX_STORAGE_ADDRESS).show_demurraged_balance(_owner);
  }

  function transfer(address _to, uint256 _value)
    public
    returns (bool _success)
  {
    _success = DummyDGXStorage(DGX_STORAGE_ADDRESS).put_transfer(msg.sender, _to, 0x0, _value, false);
  }

  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool _success)
  {
    _success = DummyDGXStorage(DGX_STORAGE_ADDRESS).put_transfer(_from, _to, msg.sender, _value, true);
  }

  function transferAndCall(
    address _receiver,
    uint256 _amount,
    bytes32 _data
  )
    public
    returns (bool _success)
  {
    transfer(_receiver, _amount);
    _success = TokenReceiver(_receiver).tokenFallback(msg.sender, _amount, _data);
    require(_success);
  }

  function approve(address _spender, uint256 _value)
    public
    returns (bool _success)
  {
    _success = DummyDGXStorage(DGX_STORAGE_ADDRESS).put_approve(msg.sender, _spender, _value);
  }

  function allowance(address _owner, address _spender)
    public
    constant
    returns (uint256 _allowance)
  {
    _allowance = DummyDGXStorage(DGX_STORAGE_ADDRESS).read_allowance(_owner, _spender);
  }

  function updateUserFeesConfigs(
    address _user,
    bool _no_demurrage_fee,
    bool _no_transfer_fee
  )
    public
    if_fees_admin()
    returns (bool _success)
  {
    _success = DummyDGXStorage(DGX_STORAGE_ADDRESS).update_user_fees_configs(
      _user,
      _no_demurrage_fee,
      _no_transfer_fee
    );
  }

  function showDemurrageConfigs()
    public
    constant
    returns (
      uint256 _base,
      uint256 _rate,
      address _collector,
      bool _no_demurrage_fee
    )
  {
    (_base, _rate, _collector, _no_demurrage_fee) = DummyDGXStorage(DGX_STORAGE_ADDRESS).read_demurrage_config_underlying();
  }

  ////////////////////////////// MOCK FUNCTIONS ///////////////////////////////

  // This function is not present in the DGX2.0 token contracts.
  // For test purpose, only used to bypass the POP process
  function mintDgxFor(address _for, uint256 _amount)
    public
    returns (bool _success)
  {
    _success = DummyDGXStorage(DGX_STORAGE_ADDRESS).mint_dgx_for(_for, _amount);
  }

  // This function is not present in the DGX2.0 token contracts.
  // For test purpose, only used to simulate demurrage deduction
  function modifyLastPaymentDate(address _of, uint256 _byMinutes)
    public
    returns (bool _success)
  {
    _success = DummyDGXStorage(DGX_STORAGE_ADDRESS).modify_last_payment_date(_of, _byMinutes);
  }
}




/// @title Digix Gold Token Demurrage Calculator
/// @author Digix Holdings Pte Ltd
/// @notice This contract is meant to be used by exchanges/other parties who want to calculate the DGX demurrage fees, provided an initial balance and the days elapsed
contract MockDgxDemurrageCalculator {
    address public TOKEN_ADDRESS;

    function token() internal view returns (DummyDGX _token) {
        _token = DummyDGX(TOKEN_ADDRESS);
    }

    constructor(address _token_address) public {
        TOKEN_ADDRESS = _token_address;
    }

    function calculateDemurrage(uint256 _initial_balance, uint256 _days_elapsed)
        public
        view
        returns (uint256 _demurrage_fees, bool _no_demurrage_fees)
    {
        uint256 _base;
        uint256 _rate;
        (_base, _rate,,_no_demurrage_fees) = token().showDemurrageConfigs();
        _demurrage_fees = (_initial_balance * _days_elapsed * _rate) / _base;
    }
}






contract DaoCalculatorService is DaoCommon {

    address public dgxDemurrageCalculatorAddress;

    using MathHelper for MathHelper;

    constructor(address _resolver, address _dgxDemurrageCalculatorAddress)
        public
    {
        require(init(CONTRACT_SERVICE_DAO_CALCULATOR, _resolver));
        dgxDemurrageCalculatorAddress = _dgxDemurrageCalculatorAddress;
    }

    function calculateAdditionalLockedDGDStake(uint256 _additionalDgd)
        public
        constant
        returns (uint256 _additionalLockedDGDStake)
    {
        // todo: change this to fixed quarter duration
        /* _additionalLockedDGDStake = _additionalDgd.mul(QUARTER_DURATION.sub(currentTimeInQuarter())).div(QUARTER_DURATION.sub(getUintConfig(CONFIG_LOCKING_PHASE_DURATION))); */
        _additionalLockedDGDStake = _additionalDgd.mul((getUintConfig(CONFIG_QUARTER_DURATION).sub(MathHelper.max(currentTimeInQuarter(), getUintConfig(CONFIG_LOCKING_PHASE_DURATION)))))
                                    .div(getUintConfig(CONFIG_QUARTER_DURATION).sub(getUintConfig(CONFIG_LOCKING_PHASE_DURATION)));
    }

    function minimumDraftQuorum(bytes32 _proposalId)
        public
        constant
        returns (uint256 _minQuorum)
    {
        uint256[] memory _fundings;

        (_fundings,) = daoStorage().readProposalFunding(_proposalId);
        _minQuorum = calculateMinQuorum(
            daoStakeStorage().totalModeratorLockedDGDStake(),
            getUintConfig(CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR),
            getUintConfig(CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR),
            getUintConfig(CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR),
            getUintConfig(CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR),
            _fundings[0]
        );
    }

    function draftQuotaPass(uint256 _for, uint256 _against)
        public
        constant
        returns (bool _passed)
    {
        if ((_for.mul(getUintConfig(CONFIG_DRAFT_QUOTA_DENOMINATOR))) >
                (getUintConfig(CONFIG_DRAFT_QUOTA_NUMERATOR).mul(_for.add(_against)))) {
            _passed = true;
        }
    }

    function minimumVotingQuorum(bytes32 _proposalId, uint256 _milestone_id)
        public
        constant
        returns (uint256 _minQuorum)
    {
        uint256[] memory _ethAskedPerMilestone;
        uint256 _finalReward;
        (_ethAskedPerMilestone,_finalReward) = daoStorage().readProposalFunding(_proposalId);
        require(_milestone_id <= _ethAskedPerMilestone.length);
        if (_milestone_id == _ethAskedPerMilestone.length) {
            _minQuorum = calculateMinQuorum(
                daoStakeStorage().totalLockedDGDStake(),
                getUintConfig(CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR),
                getUintConfig(CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR),
                getUintConfig(CONFIG_FINAL_REWARD_SCALING_FACTOR_NUMERATOR),
                getUintConfig(CONFIG_FINAL_REWARD_SCALING_FACTOR_DENOMINATOR),
                _finalReward
            );
        } else {
            _minQuorum = calculateMinQuorum(
                daoStakeStorage().totalLockedDGDStake(),
                getUintConfig(CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR),
                getUintConfig(CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR),
                getUintConfig(CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR),
                getUintConfig(CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR),
                _ethAskedPerMilestone[_milestone_id]
            );
        }
    }

    function minimumVotingQuorumForSpecial()
        public
        constant
        returns (uint256 _minQuorum)
    {
      _minQuorum = getUintConfig(CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR).mul(
                       daoStakeStorage().totalLockedDGDStake()
                   ).div(
                       getUintConfig(CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR)
                   );
    }

    function votingQuotaPass(uint256 _for, uint256 _against)
        public
        constant
        returns (bool _passed)
    {
        if ((_for.mul(getUintConfig(CONFIG_VOTING_QUOTA_DENOMINATOR))) >
                (getUintConfig(CONFIG_VOTING_QUOTA_NUMERATOR).mul(_for.add(_against)))) {
            _passed = true;
        }
    }

    function votingQuotaForSpecialPass(uint256 _for, uint256 _against)
        public
        constant
        returns (bool _passed)
    {
        if ((_for.mul(getUintConfig(CONFIG_SPECIAL_QUOTA_DENOMINATOR))) >
                (getUintConfig(CONFIG_SPECIAL_QUOTA_NUMERATOR).mul(_for.add(_against)))) {
            _passed = true;
        }
    }

    function calculateMinQuorum(
        uint256 _totalStake,
        uint256 _fixedQuorumPortionNumerator,
        uint256 _fixedQuorumPortionDenominator,
        uint256 _scalingFactorNumerator,
        uint256 _scalingFactorDenominator,
        uint256 _ethAsked
    )
        internal
        constant
        returns (uint256 _minimumQuorum)
    {
        uint256 _ethInDao = get_contract(CONTRACT_DAO_FUNDING_MANAGER).balance;
        // add the fixed portion of the quorum
        _minimumQuorum = (_totalStake.mul(_fixedQuorumPortionNumerator)).div(_fixedQuorumPortionDenominator);

        // add the dynamic portion of the quorum
        _minimumQuorum = _minimumQuorum.add(_totalStake.mul(_ethAsked.mul(_scalingFactorNumerator)).div(_ethInDao.mul(_scalingFactorDenominator)));
    }

    function calculateUserEffectiveBalance(
        uint256 _minimalParticipationPoint,
        uint256 _quarterPointScalingFactor,
        uint256 _reputationPointScalingFactor,
        uint256 _quarterPoint,
        uint256 _reputationPoint,
        uint256 _lockedDGDStake
    )
        public
        pure
        returns (uint256 _effectiveDGDBalance)
    {
        uint256 _baseDGDBalance = MathHelper.min(_quarterPoint, _minimalParticipationPoint).mul(_lockedDGDStake).div(_minimalParticipationPoint);
        _effectiveDGDBalance =
            _baseDGDBalance
            .mul(_quarterPointScalingFactor.add(_quarterPoint).sub(_minimalParticipationPoint))
            .mul(_reputationPointScalingFactor.add(_reputationPoint))
            .div(_quarterPointScalingFactor.mul(_reputationPointScalingFactor));
    }

    function calculateDemurrage(uint256 _balance, uint256 _daysElapsed)
        public
        view
        returns (uint256 _demurrageFees)
    {
        (_demurrageFees,) = MockDgxDemurrageCalculator(dgxDemurrageCalculatorAddress).calculateDemurrage(_balance, _daysElapsed);
    }


}



/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * See https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  function totalSupply() public view returns (uint256);
  function balanceOf(address _who) public view returns (uint256);
  function transfer(address _to, uint256 _value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}





/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address _owner, address _spender)
    public view returns (uint256);

  function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool);

  function approve(address _spender, uint256 _value) public returns (bool);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );
}








/**
@title Contract to manage DGX rewards
@author Digix Holdings
*/
contract DaoRewardsManager is DaoCommon {
    using MathHelper for MathHelper;
    using DaoStructs for DaoStructs.DaoQuarterInfo;
    using DaoStructs for DaoStructs.IntermediateResults;

    event StartNewQuarter(uint256 _quarterId);

    address public ADDRESS_DGX_TOKEN;

    struct UserRewards {
        uint256 lastParticipatedQuarter;
        uint256 lastQuarterThatRewardsWasUpdated;
        DaoStructs.DaoQuarterInfo qInfo;
        uint256 effectiveDGDBalance;
        uint256 effectiveModeratorDGDBalance;
    }

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

    function daoCalculatorService()
        internal
        constant
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_SERVICE_DAO_CALCULATOR));
    }

    /**
    @notice Constructor (set the quarter info for the first quarter)
    @param _resolver Address of the Contract Resolver contract
    @param _dgxAddress Address of the Digix Gold Token contract
    */
    constructor(address _resolver, address _dgxAddress)
        public
    {
        require(init(CONTRACT_DAO_REWARDS_MANAGER, _resolver));
        ADDRESS_DGX_TOKEN = _dgxAddress;
        daoRewardsStorage().updateQuarterInfo(
            1,
            getUintConfig(CONFIG_MINIMAL_QUARTER_POINT),
            getUintConfig(CONFIG_QUARTER_POINT_SCALING_FACTOR),
            getUintConfig(CONFIG_REPUTATION_POINT_SCALING_FACTOR),
            0,
            getUintConfig(CONFIG_MODERATOR_MINIMAL_QUARTER_POINT),
            getUintConfig(CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR),
            getUintConfig(CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR),
            0,
            now,
            0,
            0
        );
    }

    /**
    @notice Function to transfer the claimableDGXs to the new DaoRewardsManager
    @dev This is done during the migrateToNewDao procedure
    @param _newDaoRewardsManager Address of the new daoRewardsManager contract
    */
    function moveDGXsToNewDao(address _newDaoRewardsManager)
        public
    {
        require(sender_is(CONTRACT_DAO));
        uint256 _dgxBalance = ERC20(ADDRESS_DGX_TOKEN).balanceOf(address(this));
        ERC20(ADDRESS_DGX_TOKEN).transfer(_newDaoRewardsManager, _dgxBalance);
    }

    /**
    @notice Function to claim the DGX rewards allocated to user
    @dev Will revert if _claimableDGX <= MINIMUM_TRANSFER_AMOUNT of DGX.
         This cannot be called once the current version of Dao contracts have been migrated to newer version
    */
    function claimRewards()
        public
    {
        require(isDaoNotReplaced());

        address _user = msg.sender;
        uint256 _claimableDGX;

        // update rewards for the quarter that he last participated in
        (, _claimableDGX) = updateUserRewardsForLastParticipatingQuarter(_user);

        // withdraw from his claimableDGXs
        // This has to take into account demurrage
        // Basically, the value of claimableDGXs in the contract is for the dgxDistributionDay of (lastParticipatedQuarter + 1)
        uint256 _days_elapsed = now
            .sub(
                daoRewardsStorage().readDgxDistributionDay(
                    daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user).add(1)
                )
            )
            .div(1 days);

        daoRewardsStorage().addToTotalDgxClaimed(_claimableDGX);
        _claimableDGX = _claimableDGX.sub(
            daoCalculatorService().calculateDemurrage(
                _claimableDGX,
                _days_elapsed
            ));

        daoRewardsStorage().updateClaimableDGX(_user, 0);
        ERC20(ADDRESS_DGX_TOKEN).transfer(_user, _claimableDGX);
    }

    /**
    @notice Function to update DGX rewards of user. This is only called during locking/withdrawing DGDs, or continuing participation for new quarter
    @param _user Address of the DAO participant
    */
    function updateRewardsAndReputationBeforeNewQuarter(address _user)
        public
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        uint256 _currentQuarter = currentQuarterIndex();
        // do nothing if the rewards was already updated for the previous quarter
        // do nothing if this is the first quarter that the user is participating
        if (
            (daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user).add(1) >= _currentQuarter) ||
            (daoRewardsStorage().lastParticipatedQuarter(_user) == 0)
        ) {
            return;
        }
        updateUserRewardsForLastParticipatingQuarter(_user);
        updateUserReputationUntilPreviousQuarter(_user);
    }

    function updateUserReputationUntilPreviousQuarter (address _user)
        private
    {
        uint256 _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(_user);
        uint256 _lastQuarterThatReputationWasUpdated = daoRewardsStorage().lastQuarterThatReputationWasUpdated(_user);
        uint256 _reputationDeduction;
        if (currentQuarterIndex() <= _lastParticipatedQuarter) {
            return;
        }

        if (_lastQuarterThatReputationWasUpdated == _lastParticipatedQuarter.sub(1)) {
            updateRPfromQP(
                _user,
                daoPointsStorage().getQuarterPoint(_user, _lastParticipatedQuarter),
                getUintConfig(CONFIG_MINIMAL_QUARTER_POINT),
                getUintConfig(CONFIG_MAXIMUM_REPUTATION_DEDUCTION),
                getUintConfig(CONFIG_REPUTATION_PER_EXTRA_QP_NUM),
                getUintConfig(CONFIG_REPUTATION_PER_EXTRA_QP_DEN)
            );

            // this user is not a Moderator for current quarter
            // coz this step is done before updating the refreshModerator.
            // But may have been a Moderator before, and if was moderator in their
            // lastParticipatedQuarter, we will find them in the DoublyLinkedList.
            if (daoStakeStorage().isInModeratorsList(_user)) {
                updateRPfromQP(
                    _user,
                    daoPointsStorage().getQuarterModeratorPoint(_user, _lastParticipatedQuarter),
                    getUintConfig(CONFIG_MODERATOR_MINIMAL_QUARTER_POINT),
                    getUintConfig(CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION),
                    getUintConfig(CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM),
                    getUintConfig(CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN)
                );
            }
        }

        _reputationDeduction =
            (currentQuarterIndex().sub(1).sub(MathHelper.max(_lastParticipatedQuarter, _lastQuarterThatReputationWasUpdated)))
            .mul(
                getUintConfig(CONFIG_MAXIMUM_REPUTATION_DEDUCTION)
                .add(getUintConfig(CONFIG_PUNISHMENT_FOR_NOT_LOCKING))
            );

        if (_reputationDeduction > 0) daoPointsStorage().subtractReputation(_user, _reputationDeduction);
        daoRewardsStorage().updateLastQuarterThatReputationWasUpdated(_user, currentQuarterIndex().sub(1));
    }

    function updateRPfromQP (
        address _user,
        uint256 _userQP,
        uint256 _minimalQP,
        uint256 _maxRPDeduction,
        uint256 _rpPerExtraQP_num,
        uint256 _rpPerExtraQP_den
    ) internal {
        uint256 _reputationDeduction;
        uint256 _reputationAddition;
        if (_userQP < _minimalQP) {
            _reputationDeduction =
                _minimalQP.sub(_userQP)
                .mul(_maxRPDeduction)
                .div(_minimalQP);

            daoPointsStorage().subtractReputation(_user, _reputationDeduction);
        } else {
            _reputationAddition =
                _userQP.sub(_minimalQP)
                .mul(_rpPerExtraQP_num)
                .div(_rpPerExtraQP_den);

            daoPointsStorage().addReputation(_user, _reputationAddition);
        }
    }

    function updateUserRewardsForLastParticipatingQuarter(address _user)
        private
        returns (bool _valid, uint256 _userClaimableDgx)
    {
        UserRewards memory data;
        // the last participating quarter must be:
        // - over
        // - after the lastQuarterThatRewardsWasUpdated
        data.lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(_user);
        data.lastQuarterThatRewardsWasUpdated = daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user);

        _userClaimableDgx = daoRewardsStorage().claimableDGXs(_user);
        if (currentQuarterIndex() <= data.lastParticipatedQuarter || data.lastParticipatedQuarter <= data.lastQuarterThatRewardsWasUpdated) {
            return (false, _userClaimableDgx);
        }

        // now we will calculate the user rewards based on info of the data.lastParticipatedQuarter
        data.qInfo = readQuarterInfo(data.lastParticipatedQuarter);

        // now we "deduct the demurrage" from the claimable DGXs for time period from
        // dgxDistributionDay of lastQuarterThatRewardsWasUpdated + 1 to dgxDistributionDay of lastParticipatedQuarter + 1
        // this deducted demurrage is then added to the totalDGXsClaimed
        // the demurrage is effectively collected into totalDGXsClaimed whenever it is deducted from claimableDGXs
        uint256 _days_elapsed = daoRewardsStorage().readDgxDistributionDay(data.lastParticipatedQuarter.add(1))
            .sub(daoRewardsStorage().readDgxDistributionDay(data.lastQuarterThatRewardsWasUpdated.add(1)))
            .div(1 days);
        uint256 _demurrageFees = daoCalculatorService().calculateDemurrage(
            _userClaimableDgx,
            _days_elapsed
        );
        _userClaimableDgx = _userClaimableDgx.sub(_demurrageFees);
        daoRewardsStorage().addToTotalDgxClaimed(_demurrageFees);

        // RP has been updated at the beginning of the lastParticipatedQuarter in
        // a call to updateRewardsAndReputationBeforeNewQuarter();

        // calculate dgx rewards; This is basically the DGXs that user can withdraw on the dgxDistributionDay of the last participated quarter
        // when user actually withdraw some time after that, he will be deducted demurrage.

        data.effectiveDGDBalance = daoCalculatorService().calculateUserEffectiveBalance(
            data.qInfo.minimalParticipationPoint,
            data.qInfo.quarterPointScalingFactor,
            data.qInfo.reputationPointScalingFactor,
            daoPointsStorage().getQuarterPoint(_user, data.lastParticipatedQuarter),
            daoPointsStorage().getReputation(_user),
            daoStakeStorage().lockedDGDStake(_user)
        );

        data.effectiveModeratorDGDBalance = daoCalculatorService().calculateUserEffectiveBalance(
            data.qInfo.moderatorMinimalParticipationPoint,
            data.qInfo.moderatorQuarterPointScalingFactor,
            data.qInfo.moderatorReputationPointScalingFactor,
            daoPointsStorage().getQuarterModeratorPoint(_user, data.lastParticipatedQuarter),
            daoPointsStorage().getReputation(_user),
            daoStakeStorage().lockedDGDStake(_user)
        );

        if (daoRewardsStorage().readTotalEffectiveDGDLastQuarter(data.lastParticipatedQuarter.add(1)) > 0) {
            _userClaimableDgx = _userClaimableDgx.add(
                data.effectiveDGDBalance
                .mul(daoRewardsStorage().readRewardsPoolOfLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .mul(
                    getUintConfig(CONFIG_PORTION_TO_MODERATORS_DEN)
                    .sub(getUintConfig(CONFIG_PORTION_TO_MODERATORS_NUM))
                )
                .div(daoRewardsStorage().readTotalEffectiveDGDLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .div(getUintConfig(CONFIG_PORTION_TO_MODERATORS_DEN))
            );
        }

        if (daoRewardsStorage().readTotalEffectiveModeratorDGDLastQuarter(data.lastParticipatedQuarter.add(1)) > 0) {
            _userClaimableDgx = _userClaimableDgx.add(
                data.effectiveModeratorDGDBalance
                .mul(daoRewardsStorage().readRewardsPoolOfLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .mul(
                     getUintConfig(CONFIG_PORTION_TO_MODERATORS_NUM)
                )
                .div(daoRewardsStorage().readTotalEffectiveModeratorDGDLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .div(getUintConfig(CONFIG_PORTION_TO_MODERATORS_DEN))
            );
        }

        // update claimableDGXs. The calculation needs to take into account demurrage since the
        // dgxDistributionDay of the last quarter as well
        daoRewardsStorage().updateClaimableDGX(_user, _userClaimableDgx);

        // update lastQuarterThatRewardsWasUpdated
        daoRewardsStorage().updateLastQuarterThatRewardsWasUpdated(_user, data.lastParticipatedQuarter);
        _valid = true;
    }

    /**
    @notice Function called by the founder after transfering the DGX fees into the DAO at the beginning of the quarter
    */
    function calculateGlobalRewardsBeforeNewQuarter(uint256 _operations)
        if_founder()
        public
        returns (bool _done)
    {
        require(isDaoNotReplaced());
        require(daoUpgradeStorage().startOfFirstQuarter() != 0); // start of first quarter must have been set already
        require(isLockingPhase());
        require(daoRewardsStorage().readDgxDistributionDay(currentQuarterIndex()) == 0);
        QuarterRewardsInfo memory info;
        info.previousQuarter = currentQuarterIndex().sub(1);
        require(info.previousQuarter > 0); // throw if this is the first quarter
        info.qInfo = readQuarterInfo(info.previousQuarter);

        DaoStructs.IntermediateResults memory interResults;
        (
            interResults.countedUntil,,,
            info.totalEffectiveDGDPreviousQuarter
        ) = intermediateResultsStorage().getIntermediateResults(keccak256(abi.encodePacked(INTERMEDIATE_DGD_IDENTIFIER, info.previousQuarter)));

        _operations = sumEffectiveBalance(info, false, _operations, interResults);
        if (!info.doneCalculatingEffectiveBalance) { return false; }

        (
            interResults.countedUntil,,,
            info.totalEffectiveModeratorDGDLastQuarter
        ) = intermediateResultsStorage().getIntermediateResults(keccak256(abi.encodePacked(INTERMEDIATE_MODERATOR_DGD_IDENTIFIER, info.previousQuarter)));

        sumEffectiveBalance(info, true, _operations, interResults);
        if (!info.doneCalculatingModeratorEffectiveBalance) { return false; }
        // save the quarter Info
        processGlobalRewardsUpdate(info);
        _done = true;

        emit StartNewQuarter(currentQuarterIndex());
    }

    function processGlobalRewardsUpdate(QuarterRewardsInfo memory info) internal {
        // calculate how much DGX rewards we got for this quarter
        info.dgxRewardsPoolLastQuarter =
            ERC20(ADDRESS_DGX_TOKEN).balanceOf(address(this))
            .add(daoRewardsStorage().totalDGXsClaimed())
            .sub(info.qInfo.sumRewardsFromBeginning);

        daoRewardsStorage().updateQuarterInfo(
            info.previousQuarter.add(1),
            getUintConfig(CONFIG_MINIMAL_QUARTER_POINT),
            getUintConfig(CONFIG_QUARTER_POINT_SCALING_FACTOR),
            getUintConfig(CONFIG_REPUTATION_POINT_SCALING_FACTOR),
            info.totalEffectiveDGDPreviousQuarter,

            getUintConfig(CONFIG_MODERATOR_MINIMAL_QUARTER_POINT),
            getUintConfig(CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR),
            getUintConfig(CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR),
            info.totalEffectiveModeratorDGDLastQuarter,

            now,
            info.dgxRewardsPoolLastQuarter,
            info.qInfo.sumRewardsFromBeginning.add(info.dgxRewardsPoolLastQuarter)
        );
    }

    function sumEffectiveBalance (
        QuarterRewardsInfo memory info,
        bool _badgeCalculation,
        uint256 _operations,
        DaoStructs.IntermediateResults memory _interResults
    )
        internal
        returns (uint _operationsLeft)
    {
        if (_operations == 0) return _operations;

        if (_interResults.countedUntil == EMPTY_ADDRESS) {
            info.users = _badgeCalculation ?
                daoListingService().listModerators(_operations, true)
                : daoListingService().listParticipants(_operations, true);
        } else {
            info.users = _badgeCalculation ?
                daoListingService().listModeratorsFrom(_interResults.countedUntil, _operations, true)
                : daoListingService().listParticipantsFrom(_interResults.countedUntil, _operations, true);

            // if the address is the already the last, it means this is the first step, and its already done;
            if (info.users.length == 0) {
                info.doneCalculatingEffectiveBalance = true;
                return _operations;
            }
        }

        address _lastAddress;
        _lastAddress = info.users[info.users.length - 1];

        info.userCount = info.users.length;
        for (info.i=0;info.i<info.userCount;info.i++) {
            info.currentUser = info.users[info.i];
            // check if this participant really did participate in the previous quarter
            if (daoRewardsStorage().lastParticipatedQuarter(info.currentUser) < info.previousQuarter) {
                continue;
            }
            if (_badgeCalculation) {
                info.totalEffectiveModeratorDGDLastQuarter = info.totalEffectiveModeratorDGDLastQuarter.add(daoCalculatorService().calculateUserEffectiveBalance(
                    info.qInfo.moderatorMinimalParticipationPoint,
                    info.qInfo.moderatorQuarterPointScalingFactor,
                    info.qInfo.moderatorReputationPointScalingFactor,
                    daoPointsStorage().getQuarterModeratorPoint(info.currentUser, info.previousQuarter),
                    daoPointsStorage().getReputation(info.currentUser),
                    daoStakeStorage().lockedDGDStake(info.currentUser)
                ));
            } else {
                info.totalEffectiveDGDPreviousQuarter = info.totalEffectiveDGDPreviousQuarter.add(daoCalculatorService().calculateUserEffectiveBalance(
                    info.qInfo.minimalParticipationPoint,
                    info.qInfo.quarterPointScalingFactor,
                    info.qInfo.reputationPointScalingFactor,
                    daoPointsStorage().getQuarterPoint(info.currentUser, info.previousQuarter),
                    daoPointsStorage().getReputation(info.currentUser),
                    daoStakeStorage().lockedDGDStake(info.currentUser)
                ));
            }
        }

        // check if we have reached the last guy in the current list
        if (_lastAddress == daoStakeStorage().readLastModerator() && _badgeCalculation) {
            info.doneCalculatingModeratorEffectiveBalance = true;
        }
        if (_lastAddress == daoStakeStorage().readLastParticipant() && !_badgeCalculation) {
            info.doneCalculatingEffectiveBalance = true;
        }
        intermediateResultsStorage().setIntermediateResults(
            keccak256(abi.encodePacked(_badgeCalculation ? INTERMEDIATE_MODERATOR_DGD_IDENTIFIER : INTERMEDIATE_DGD_IDENTIFIER, info.previousQuarter)),
            _lastAddress,
            0,0,
            _badgeCalculation ? info.totalEffectiveModeratorDGDLastQuarter : info.totalEffectiveDGDPreviousQuarter
        );

        _operationsLeft = _operations.sub(info.userCount);
    }

    function readQuarterInfo(uint256 _quarterIndex)
        internal
        constant
        returns (DaoStructs.DaoQuarterInfo _qInfo)
    {
        (
            _qInfo.minimalParticipationPoint,
            _qInfo.quarterPointScalingFactor,
            _qInfo.reputationPointScalingFactor,
            _qInfo.totalEffectiveDGDPreviousQuarter
        ) = daoRewardsStorage().readQuarterParticipantInfo(_quarterIndex);
        (
            _qInfo.moderatorMinimalParticipationPoint,
            _qInfo.moderatorQuarterPointScalingFactor,
            _qInfo.moderatorReputationPointScalingFactor,
            _qInfo.totalEffectiveModeratorDGDLastQuarter
        ) = daoRewardsStorage().readQuarterModeratorInfo(_quarterIndex);
        (
            _qInfo.dgxDistributionDay,
            _qInfo.dgxRewardsPoolLastQuarter,
            _qInfo.sumRewardsFromBeginning
        ) = daoRewardsStorage().readQuarterGeneralInfo(_quarterIndex);
    }
}


library DaoIntermediateStructs {

    // Struct used in large functions to cut down on variables
    // store the summation of weights "FOR" proposal
    // store the summation of weights "AGAINST" proposal
    struct VotingCount {
        // weight of votes "FOR" the voting round
        uint256 forCount;
        // weight of votes "AGAINST" the voting round
        uint256 againstCount;
    }

    // Struct used in large functions to cut down on variables
    struct Users {
        // List of addresses, participants of DigixDAO
        address[] users;
        // Length of the above list
        uint256 usersLength;
    }
}










/**
@title Contract to claim voting results
@author Digix Holdings
*/
contract DaoVotingClaims is DaoCommon, Claimable {
    using DaoIntermediateStructs for DaoIntermediateStructs.VotingCount;
    using DaoIntermediateStructs for DaoIntermediateStructs.Users;
    using DaoStructs for DaoStructs.IntermediateResults;

    function daoCalculatorService()
        internal
        constant
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_SERVICE_DAO_CALCULATOR));
    }

    function daoFundingManager()
        internal
        constant
        returns (DaoFundingManager _contract)
    {
        _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
    }

    function daoRewardsManager()
        internal
        constant
        returns (DaoRewardsManager _contract)
    {
        _contract = DaoRewardsManager(get_contract(CONTRACT_DAO_REWARDS_MANAGER));
    }

    constructor(address _resolver) public {
        require(init(CONTRACT_DAO_VOTING_CLAIMS, _resolver));
    }

    /**
    @notice Function to claim the draft voting result (can only be called by the proposal proposer)
    @param _proposalId ID of the proposal
    @param _count Number of operations to do in this call
    @return {
      "_passed": "Boolean, true if the draft voting has passed, false if the claiming deadline has passed, revert otherwise"
    }
    */
    function claimDraftVotingResult(
        bytes32 _proposalId,
        uint256 _count
    )
        public
        ifDraftNotClaimed(_proposalId)
        ifAfterDraftVotingPhase(_proposalId)
        returns (bool _passed)
    {

        // if after the claiming deadline, its auto failed
        if (now > daoStorage().readProposalDraftVotingTime(_proposalId)
                    .add(getUintConfig(CONFIG_DRAFT_VOTING_PHASE))
                    .add(getUintConfig(CONFIG_VOTE_CLAIMING_DEADLINE))) {
            daoStorage().setProposalDraftPass(_proposalId, false);
            daoStorage().setDraftVotingClaim(_proposalId, true);
            processCollateralRefund(_proposalId);
            return false;
        }
        require(isFromProposer(_proposalId));
        senderCanDoProposerOperations();
        checkNonDigixProposalLimit(_proposalId);


        // get the previously stored intermediary state
        DaoStructs.IntermediateResults memory _currentResults;
        (
            _currentResults.countedUntil,
            _currentResults.currentForCount,
            _currentResults.currentAgainstCount,
        ) = intermediateResultsStorage().getIntermediateResults(_proposalId);

        // get first address based on intermediate state
        address[] memory _moderators;
        if (_currentResults.countedUntil == EMPTY_ADDRESS) {
            _moderators = daoListingService().listModerators(
                _count,
                true
            );
        } else {
            _moderators = daoListingService().listModeratorsFrom(
               _currentResults.countedUntil,
               _count,
               true
           );
        }

        // get moderators
        address _moderator = _moderators[_moderators.length-1];

        // count the votes for this batch of moderators
        DaoIntermediateStructs.VotingCount memory _voteCount;
        (_voteCount.forCount, _voteCount.againstCount) = daoStorage().readDraftVotingCount(_proposalId, _moderators);

        _currentResults.countedUntil = _moderator;
        _currentResults.currentForCount = _currentResults.currentForCount.add(_voteCount.forCount);
        _currentResults.currentAgainstCount = _currentResults.currentAgainstCount.add(_voteCount.againstCount);

        if (_moderator == daoStakeStorage().readLastModerator()) {
            // this is the last iteration
            _passed = true;
            processDraftVotingClaim(_proposalId, _currentResults);

            // reset intermediate result for the proposal
            intermediateResultsStorage().resetIntermediateResults(_proposalId);
        } else {
            // update intermediate results
            intermediateResultsStorage().setIntermediateResults(
                _proposalId,
                _currentResults.countedUntil,
                _currentResults.currentForCount,
                _currentResults.currentAgainstCount,
                0
            );
        }
    }

    function processDraftVotingClaim(bytes32 _proposalId, DaoStructs.IntermediateResults _currentResults)
        internal
    {
        if (
            (_currentResults.currentForCount.add(_currentResults.currentAgainstCount) > daoCalculatorService().minimumDraftQuorum(_proposalId)) &&
            (daoCalculatorService().draftQuotaPass(_currentResults.currentForCount, _currentResults.currentAgainstCount))
        ) {
            daoStorage().setProposalDraftPass(_proposalId, true);

            // set startTime of first voting round
            // and the start of first milestone.
            uint256 _idealClaimTime = daoStorage().readProposalDraftVotingTime(_proposalId).add(getUintConfig(CONFIG_DRAFT_VOTING_PHASE));
            daoStorage().setProposalVotingTime(
                _proposalId,
                0,
                getTimelineForNextVote(0, _idealClaimTime)
            );
        } else {
            processCollateralRefund(_proposalId);
        }

        daoStorage().setDraftVotingClaim(_proposalId, true);
    }

    /// NOTE: Voting round i-th is before milestone index i-th

    /**
    @notice Function to claim the  voting round results (can only be called by the proposer)
    @param _proposalId ID of the proposal
    @param _index Index of the  voting round
    @param _operations Number of operations to do in this call
    @return {
      "_passed": "Boolean, true if the  voting round passed, false if failed"
    }
    */
    function claimProposalVotingResult(bytes32 _proposalId, uint256 _index, uint256 _operations)
        public
        ifNotClaimed(_proposalId, _index)
        ifAfterProposalRevealPhase(_proposalId, _index)
        returns (bool _passed, bool _done)
    {
        require(isMainPhase());
        // anyone can claim after the claiming deadline is over;
        // and the result will be failed by default
        _done = true;
        if (now < startOfMilestone(_proposalId, _index)
                    .add(getUintConfig(CONFIG_VOTE_CLAIMING_DEADLINE)))
        {
            (_operations, _passed, _done) = countProposalVote(_proposalId, _index, _operations);
            if (!_done) return (_passed, false); // haven't done counting yet, return
        }
        _done = false;

        if (_index > 0) { // We only need to do bonus calculation if its the interim voting round
            _done = calculateVoterBonus(_proposalId, _index, _operations, _passed);
            if (!_done) return (_passed, false);
        } else {
            // its the first voting round, we unlock the collateral if it fails, locks if it passes
            if (_passed) {
                daoStorage().setProposalCollateralStatus(
                    _proposalId,
                    COLLATERAL_STATUS_LOCKED
                );
            } else {
                processCollateralRefund(_proposalId);
            }

            checkNonDigixProposalLimit(_proposalId);
        }

        if (_passed) {
            allocateFunding(_proposalId, _index);
        }
        daoStorage().setVotingClaim(_proposalId, _index, true);
        daoStorage().setProposalPass(_proposalId, _index, _passed);
        _done = true;
    }

    function allocateFunding(bytes32 _proposalId, uint256 _index)
        internal
    {
        uint256 _funding;
        (, _funding) = daoStorage().readProposalMilestone(_proposalId, _index);
        uint256[] memory _milestoneFundings;
        (_milestoneFundings,) = daoStorage().readProposalFunding(_proposalId);

        // if this was the last milestone, unlock their original collateral
        if ((_index == _milestoneFundings.length) && !isProposalPaused(_proposalId)) {
            processCollateralRefund(_proposalId);
        }

        bool _isDigixProposal;
        (,,,,,,,,,_isDigixProposal) = daoStorage().readProposal(_proposalId);
        if (_index == 0 && !_isDigixProposal) {
            daoStorage().addNonDigixProposalCountInQuarter(currentQuarterIndex());
        }

        daoPointsStorage().addQuarterPoint(
            daoStorage().readProposalProposer(_proposalId),
            getUintConfig(CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH).mul(_funding).div(10000 ether),
            currentQuarterIndex()
        );
    }

    function calculateVoterBonus(bytes32 _proposalId, uint256 _index, uint256 _operations, bool _passed)
        internal
        returns (bool _done)
    {
        if (_operations == 0) return false;
        address _countedUntil;
        (_countedUntil,,,) = intermediateResultsStorage().getIntermediateResults(_proposalId);

        address[] memory _voterBatch;
        if (_countedUntil == EMPTY_ADDRESS) {
            _voterBatch = daoListingService().listParticipants(
                _operations,
                true
            );
        } else {
            _voterBatch = daoListingService().listParticipantsFrom(
                _countedUntil,
                _operations,
                true
            );
        }
        address _lastVoter = _voterBatch[_voterBatch.length - 1]; // this will fail if _voterBatch is empty

        DaoIntermediateStructs.Users memory _bonusVoters;
        if (_passed) {

            // give bonus points for all those who
            // voted YES in the previous round
            (_bonusVoters.users, _bonusVoters.usersLength) = daoStorage().readVotingRoundVotes(_proposalId, _index.sub(1), _voterBatch, true);
        } else {
            // give bonus points for all those who
            // voted NO in the previous round
            (_bonusVoters.users, _bonusVoters.usersLength) = daoStorage().readVotingRoundVotes(_proposalId, _index.sub(1), _voterBatch, false);
        }
        if (_bonusVoters.usersLength > 0) addBonusReputation(_bonusVoters.users, _bonusVoters.usersLength);

        if (_lastVoter == daoStakeStorage().readLastParticipant()) {
            // this is the last iteration

            intermediateResultsStorage().resetIntermediateResults(_proposalId);
            _done = true;
        } else {
            // this is not the last iteration yet
            intermediateResultsStorage().setIntermediateResults(_proposalId, _lastVoter, 0, 0, 0);
        }
    }

    function countProposalVote(bytes32 _proposalId, uint256 _index, uint256 _operations)
        internal
        returns (uint256 _operationsLeft, bool _passed, bool _done)
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        DaoStructs.IntermediateResults memory _currentResults;
        (
            _currentResults.countedUntil,
            _currentResults.currentForCount,
            _currentResults.currentAgainstCount,
        ) = intermediateResultsStorage().getIntermediateResults(_proposalId);
        address[] memory _voters;
        if (_currentResults.countedUntil == EMPTY_ADDRESS) {
            _voters = daoListingService().listParticipants(
                _operations,
                true
            );
        } else {
            _voters = daoListingService().listParticipantsFrom(
                _currentResults.countedUntil,
                _operations,
                true
            );

            // There's no more operations to be done, or there's no voters to count
            if (_operations == 0 || _voters.length == 0) {
                return (_operations, false, true);
            }
        }

        address _lastVoter = _voters[_voters.length - 1];

        DaoIntermediateStructs.VotingCount memory _count;
        (_count.forCount, _count.againstCount) = daoStorage().readVotingCount(_proposalId, _index, _voters);

        _currentResults.currentForCount = _currentResults.currentForCount.add(_count.forCount);
        _currentResults.currentAgainstCount = _currentResults.currentAgainstCount.add(_count.againstCount);
        intermediateResultsStorage().setIntermediateResults(
            _proposalId,
            _lastVoter,
            _currentResults.currentForCount,
            _currentResults.currentAgainstCount,
            0
        );

        if (_lastVoter != daoStakeStorage().readLastParticipant()) {
            return (0, false, false); // hasn't done counting yet
        }

        // this means all votes have already been counted
        intermediateResultsStorage().resetIntermediateResults(_proposalId);
        _operationsLeft = _operations.sub(_voters.length);
        _done = true;

        if ((_currentResults.currentForCount.add(_currentResults.currentAgainstCount) > daoCalculatorService().minimumVotingQuorum(_proposalId, _index)) &&
            (daoCalculatorService().votingQuotaPass(_currentResults.currentForCount, _currentResults.currentAgainstCount)))
        {
            _passed = true;
        }
    }

    function processCollateralRefund(bytes32 _proposalId)
        internal
    {
        daoStorage().setProposalCollateralStatus(_proposalId, COLLATERAL_STATUS_CLAIMED);
        require(daoFundingManager().refundCollateral(daoStorage().readProposalProposer(_proposalId)));
    }

    function addBonusReputation(address[] _voters, uint256 _n)
        private
    {
        uint256 _qp = getUintConfig(CONFIG_QUARTER_POINT_VOTE);
        uint256 _rate = getUintConfig(CONFIG_BONUS_REPUTATION_NUMERATOR);
        uint256 _base = getUintConfig(CONFIG_BONUS_REPUTATION_DENOMINATOR);

        uint256 _bonus = _qp.mul(_rate).mul(getUintConfig(CONFIG_REPUTATION_PER_EXTRA_QP_NUM))
            .div(
                _base.mul(getUintConfig(CONFIG_REPUTATION_PER_EXTRA_QP_DEN))
            );

        for (uint256 i = 0; i < _n; i++) {
            daoPointsStorage().addReputation(_voters[i], _bonus);
        }
    }

}








/**
@title Interactive DAO contract for creating/modifying/endorsing proposals
@author Digix Holdings
*/
contract Dao is DaoCommon, Claimable {

    event NewProposal(bytes32 _proposalId, address _proposer);
    event ModifyProposal(bytes32 _proposalId, bytes32 _newDoc);
    event ChangeProposalFunding(bytes32 _proposalId);
    event FinalizeProposal(bytes32 _proposalId);
    event FinishMilestone(bytes32 _proposalId, uint256 _milestoneIndex);
    event AddProposalDoc(bytes32 _proposalId, bytes32 _newDoc);
    event PRLAction(bytes32 _proposalId, uint256 _actionId, bytes32 _doc);
    event StartSpecialProposal(bytes32 _specialProposalId);

    constructor(address _resolver) public {
        require(init(CONTRACT_DAO, _resolver));
    }

    function daoFundingManager()
        internal
        constant
        returns (DaoFundingManager _contract)
    {
        _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
    }

    function daoRewardsManager()
        internal
        constant
        returns (DaoRewardsManager _contract)
    {
        _contract = DaoRewardsManager(get_contract(CONTRACT_DAO_REWARDS_MANAGER));
    }

    function daoVotingClaims()
        internal
        constant
        returns (DaoVotingClaims _contract)
    {
        _contract = DaoVotingClaims(get_contract(CONTRACT_DAO_VOTING_CLAIMS));
    }

    /**
    @notice Set addresses for the new Dao and DaoFundingManager contracts
    @dev This is the first step of the 2-step migration
    @param _newDaoContract Address of the new Dao contract
    @param _newDaoFundingManager Address of the new DaoFundingManager contract
    @param _newDaoRewardsManager Address of the new daoRewardsManager contract
    */
    function setNewDaoContracts(
        address _newDaoContract,
        address _newDaoFundingManager,
        address _newDaoRewardsManager
    )
        public
        onlyOwner()
    {
        require(daoUpgradeStorage().isReplacedByNewDao() == false);
        daoUpgradeStorage().setNewContractAddresses(
            _newDaoContract,
            _newDaoFundingManager,
            _newDaoRewardsManager
        );
    }

    /**
    @notice Migrate this DAO to a new DAO contract
    @dev Migration can be done only during the locking phase, after the global rewards for current quarter are set.
         This is to make sure that there is no rewards calculation pending before the DAO is migrated to new contracts
    @param _newDaoContract Address of the new DAO contract
    @param _newDaoFundingManager Address of the new DaoFundingManager contract, which would receive the remaining ETHs in this DaoFundingManager
    @param _newDaoRewardsManager Address of the new daoRewardsManager contract, which would receive the claimableDGXs from this daoRewardsManager
    */
    function migrateToNewDao(
        address _newDaoContract,
        address _newDaoFundingManager,
        address _newDaoRewardsManager
    )
        public
        onlyOwner()
        ifGlobalRewardsSet(currentQuarterIndex())
    {
        require(isLockingPhase());
        require(daoUpgradeStorage().isReplacedByNewDao() == false);
        require(
          (daoUpgradeStorage().newDaoContract() == _newDaoContract) &&
          (daoUpgradeStorage().newDaoFundingManager() == _newDaoFundingManager) &&
          (daoUpgradeStorage().newDaoRewardsManager() == _newDaoRewardsManager)
        );
        daoUpgradeStorage().updateForDaoMigration();
        daoFundingManager().moveFundsToNewDao(_newDaoFundingManager);
        daoRewardsManager().moveDGXsToNewDao(_newDaoRewardsManager);
    }

    /**
    @notice Call this function to mark the start of the DAO's first quarter. This can only be done once, by a founder
    @param _start Start time of the first quarter in the DAO
    */
    function setStartOfFirstQuarter(uint256 _start) public if_founder() {
        require(daoUpgradeStorage().startOfFirstQuarter() == 0);
        daoUpgradeStorage().setStartOfFirstQuarter(_start);
    }

    /**
    @notice Submit a new preliminary idea / Pre-proposal
    @param _docIpfsHash Hash of the IPFS doc containing details of proposal
    @param _milestonesFundings Array of fundings of the proposal milestones (in wei)
    @param _finalReward Final reward asked by proposer at successful completion of all milestones of proposal
    */
    function submitPreproposal(
        bytes32 _docIpfsHash,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
        payable
        ifFundingPossible(_milestonesFundings, _finalReward)
    {
        senderCanDoProposerOperations();
        bool _isFounder = is_founder();

        require(msg.value == getUintConfig(CONFIG_PREPROPOSAL_DEPOSIT));
        require(address(daoFundingManager()).call.value(msg.value)());

        checkNonDigixFundings(_milestonesFundings, _finalReward);

        daoStorage().addProposal(_docIpfsHash, msg.sender, _milestonesFundings, _finalReward, _isFounder);
        daoStorage().setProposalCollateralStatus(_docIpfsHash, COLLATERAL_STATUS_UNLOCKED);

        emit NewProposal(_docIpfsHash, msg.sender);
    }

    /**
    @notice Modify a proposal (this can be done only before setting the final version)
    @param _proposalId Proposal ID (hash of IPFS doc of the first version of the proposal)
    @param _docIpfsHash Hash of IPFS doc of the modified version of the proposal
    @param _milestonesFundings Array of fundings of the modified version of the proposal (in wei)
    @param _finalReward Final reward on successful completion of all milestones of the modified version of proposal (in wei)
    */
    function modifyProposal(
        bytes32 _proposalId,
        bytes32 _docIpfsHash,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        require(isEditable(_proposalId));
        bytes32 _currentState;
        (,,,_currentState,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_currentState == PROPOSAL_STATE_PREPROPOSAL ||
          _currentState == PROPOSAL_STATE_DRAFT);

        checkNonDigixFundings(_milestonesFundings, _finalReward);

        daoStorage().editProposal(_proposalId, _docIpfsHash, _milestonesFundings, _finalReward);

        emit ModifyProposal(_proposalId, _docIpfsHash);
    }

    /**
    @notice Function to change the funding structure for a proposal
    @dev Proposers can only change fundings for the subsequent milestones,
    during the duration of an on-going milestone (so, cannot be during any voting phase)
    @param _proposalId ID of the proposal
    @param _milestonesFundings Array of fundings for milestones
    @param _finalReward Final reward needed for completion of proposal
    @param _currentMilestone the milestone number the proposal is currently in
    */
    function changeFundings(
        bytes32 _proposalId,
        uint256[] _milestonesFundings,
        uint256 _finalReward,
        uint256 _currentMilestone
    )
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        checkNonDigixFundings(_milestonesFundings, _finalReward);

        uint256[] memory _currentFundings;
        (_currentFundings,) = daoStorage().readProposalFunding(_proposalId);

        uint256 _startOfCurrentMilestone = startOfMilestone(_proposalId, _currentMilestone);

        // start of milestone must be more than 1st Jan 2000, otherwise the voting for this milestone hasn't even started yet
        require(_startOfCurrentMilestone > 946684800);

        // must be after the start of the milestone, and the milestone has not been finished yet (voting hasnt started)
        require(now > _startOfCurrentMilestone);
        require(daoStorage().readProposalVotingTime(_proposalId, _currentMilestone.add(1)) == 0);

        // can only modify the fundings after _currentMilestone
        //so, all the fundings from 0 to _currentMilestone must be the same
        for (uint256 i=0;i<=_currentMilestone;i++) {
            require(_milestonesFundings[i] == _currentFundings[i]);
        }

        daoStorage().changeFundings(_proposalId, _milestonesFundings, _finalReward);

        emit ChangeProposalFunding(_proposalId);
    }

    /**
    @notice Finalize a proposal
    @dev After finalizing a proposal, it cannot be modified further
    @param _proposalId ID of the proposal
    */
    function finalizeProposal(bytes32 _proposalId)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));
        require(isEditable(_proposalId));
        checkNonDigixProposalLimit(_proposalId);

        require(getTimeLeftInQuarter(now) > getUintConfig(CONFIG_DRAFT_VOTING_PHASE).add(getUintConfig(CONFIG_VOTE_CLAIMING_DEADLINE)));
        address _endorser;
        (,,_endorser,,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_endorser != EMPTY_ADDRESS);
        daoStorage().finalizeProposal(_proposalId);
        daoStorage().setProposalDraftVotingTime(_proposalId, now);

        emit FinalizeProposal(_proposalId);
    }

    /**
    @notice Function to set milestone to be completed
    @dev This can only be called in the Main Phase of DigixDAO by the proposer. It sets the
         voting time for the next milestone. If not enough time left in the current
         quarter, then the next voting is postponed to the start of next quarter
    @param _proposalId ID of the proposal
    @param _milestoneIndex Index of the milestone. Index starts from 0 (for the first milestone)
    */
    function finishMilestone(bytes32 _proposalId, uint256 _milestoneIndex)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        // must be after the start of this milestone, and the milestone has not been finished yet (voting hasnt started)
        uint256 _startOfCurrentMilestone = startOfMilestone(_proposalId, _milestoneIndex);
        require(_startOfCurrentMilestone > 946684800);
        require(now > _startOfCurrentMilestone);
        require(daoStorage().readProposalVotingTime(_proposalId, _milestoneIndex.add(1)) == 0);

        daoStorage().setProposalVotingTime(
            _proposalId,
            _milestoneIndex.add(1),
            getTimelineForNextVote(_milestoneIndex.add(1), now)
        ); // set the voting time of next voting

        emit FinishMilestone(_proposalId, _milestoneIndex);
    }

    /**
    @notice Add IPFS docs to a proposal
    @dev This is allowed only after a proposal is finalized. Before finalizing
         a proposal, proposer must modifyProposal. After the proposal is finalized,
         they can allProposalDoc to that proposal
    @param _proposalId ID of the proposal
    @param _newDoc hash of the new IPFS doc
    */
    function addProposalDoc(bytes32 _proposalId, bytes32 _newDoc)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));
        bytes32 _finalVersion;
        (,,,,,,,_finalVersion,,) = daoStorage().readProposal(_proposalId);
        require(_finalVersion != EMPTY_BYTES);
        daoStorage().addProposalDoc(_proposalId, _newDoc);

        emit AddProposalDoc(_proposalId, _newDoc);
    }

    /**
    @notice Function to endorse a pre-proposal (can be called only by DAO Moderator)
    @param _proposalId ID of the proposal (hash of IPFS doc of the first version of the proposal)
    */
    function endorseProposal(bytes32 _proposalId)
        public
        isProposalState(_proposalId, PROPOSAL_STATE_PREPROPOSAL)
    {
        require(isMainPhase());
        require(isModerator(msg.sender));
        daoStorage().updateProposalEndorse(_proposalId, msg.sender);
    }

    /**
    @notice Function to update the PRL (regulatory status) status of a proposal
    @param _proposalId ID of the proposal
    @param _doc hash of IPFS uploaded document, containing details of PRL Action
    */
    function updatePRL(
        bytes32 _proposalId,
        uint256 _action,
        bytes32 _doc
    )
        public
        if_prl()
    {
        require(_action == PRL_ACTION_STOP || _action == PRL_ACTION_PAUSE || _action == PRL_ACTION_UNPAUSE);
        daoStorage().updateProposalPRL(_proposalId, _action, _doc, now);

        emit PRLAction(_proposalId, _action, _doc);
    }

    /**
    @notice Function to create a Special Proposal (can only be created by the founders)
    @param _doc hash of the IPFS doc of the special proposal details
    @param _uintConfigs Array of the new UINT256 configs
    @param _addressConfigs Array of the new Address configs
    @param _bytesConfigs Array of the new Bytes32 configs
    @return {
      "_success": "true if created special successfully"
    }
    */
    function createSpecialProposal(
        bytes32 _doc,
        uint256[] _uintConfigs,
        address[] _addressConfigs,
        bytes32[] _bytesConfigs
    )
        public
        if_founder()
        returns (bool _success)
    {
        require(isMainPhase());
        address _proposer = msg.sender;
        daoSpecialStorage().addSpecialProposal(
            _doc,
            _proposer,
            _uintConfigs,
            _addressConfigs,
            _bytesConfigs
        );
        _success = true;
    }

    /**
    @notice Function to set start of voting round for special proposal
    @param _proposalId ID of the special proposal
    */
    function startSpecialProposalVoting(
        bytes32 _proposalId
    )
        public
    {
        require(isMainPhase());
        require(daoSpecialStorage().readProposalProposer(_proposalId) == msg.sender);
        require(daoSpecialStorage().readVotingTime(_proposalId) == 0);
        require(getTimeLeftInQuarter(now) > getUintConfig(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
        daoSpecialStorage().setVotingTime(_proposalId, now);

        emit StartSpecialProposal(_proposalId);
    }

    /**
    @notice Function to close proposal (also get back collateral)
    @dev Can only be closed if the proposal has not been finalized yet
    @param _proposalId ID of the proposal
    */
    function closeProposal(bytes32 _proposalId)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));
        bytes32 _finalVersion;
        bytes32 _status;
        (,,,_status,,,,_finalVersion,,) = daoStorage().readProposal(_proposalId);
        require(_finalVersion == EMPTY_BYTES);
        require(_status != PROPOSAL_STATE_CLOSED);
        require(daoStorage().readProposalCollateralStatus(_proposalId) == COLLATERAL_STATUS_UNLOCKED);

        daoStorage().closeProposal(_proposalId);
        daoStorage().setProposalCollateralStatus(_proposalId, COLLATERAL_STATUS_CLAIMED);
        require(daoFundingManager().refundCollateral(msg.sender));
    }

    /**
    @notice Function for founders to close all the dead proposals
    @dev all proposals who are not yet finalized, and been there for more than the threshold time
    @param _proposalIds Array of proposal IDs
    */
    function founderCloseProposals(bytes32[] _proposalIds)
        public
        if_founder()
    {
        uint256 _length = _proposalIds.length;
        uint256 _timeCreated;
        bytes32 _finalVersion;
        for (uint256 _i = 0; _i < _length; _i++) {
            (,,,,_timeCreated,,,_finalVersion,,) = daoStorage().readProposal(_proposalIds[_i]);
            require(_finalVersion == EMPTY_BYTES);
            require(now > _timeCreated.add(getUintConfig(CONFIG_PROPOSAL_DEAD_DURATION)));
            daoStorage().closeProposal(_proposalIds[_i]);
        }
    }
}





/**
@title Contract to manage DAO funds
@author Digix Holdings
*/
contract DaoFundingManager is DaoCommon {

    constructor(address _resolver) public {
        require(init(CONTRACT_DAO_FUNDING_MANAGER, _resolver));
    }

    function dao()
        internal
        constant
        returns (Dao _contract)
    {
        _contract = Dao(get_contract(CONTRACT_DAO));
    }

    /**
    @notice Call function to claim ETH allocated by DAO (transferred to caller)
    @param _proposalId ID of the proposal
    @param _index Index of the proposal voting round
    */
    function claimFunding(bytes32 _proposalId, uint256 _index)
        public
    {
        require(isFromProposer(_proposalId));

        // proposal should not be paused/stopped
        require(!isProposalPaused(_proposalId));

        require(!daoStorage().readIfMilestoneFunded(_proposalId, _index));
        require(daoStorage().readProposalVotingResult(_proposalId, _index));
        require(daoStorage().isClaimed(_proposalId, _index));

        uint256 _funding;
        (, _funding) = daoStorage().readProposalMilestone(_proposalId, _index);

        daoFundingStorage().withdrawEth(_funding);
        daoStorage().setMilestoneFunded(_proposalId, _index);

        msg.sender.transfer(_funding);
    }

    /**
    @notice Function to refund the collateral to _receiver
    @dev Can only be called from the Dao contract
    @param _receiver The receiver of the funds
    @return {
      "_success": "Boolean, true if refund was successful"
    }
    */
    function refundCollateral(address _receiver)
        public
        returns (bool _success)
    {
        require(sender_is_from([CONTRACT_DAO, CONTRACT_DAO_VOTING_CLAIMS, EMPTY_BYTES]));
        refundCollateralInternal(_receiver);
        _success = true;
    }

    function refundCollateralInternal(address _receiver)
        internal
    {
        daoFundingStorage().withdrawEth(getUintConfig(CONFIG_PREPROPOSAL_DEPOSIT));
        _receiver.transfer(getUintConfig(CONFIG_PREPROPOSAL_DEPOSIT));
    }

    /**
    @notice Function to move funds to a new DAO
    @param _destinationForDaoFunds Ethereum contract address of the new DaoFundingManager
    */
    function moveFundsToNewDao(address _destinationForDaoFunds)
        public
    {
        require(sender_is(CONTRACT_DAO));
        uint256 _remainingBalance = address(this).balance;
        daoFundingStorage().withdrawEth(_remainingBalance);
        _destinationForDaoFunds.transfer(_remainingBalance);
    }

    /**
    @notice Payable function to receive ETH funds from DigixDAO crowdsale contract
    */
    function () payable public {
        daoFundingStorage().addEth(msg.value);
    }
}








/**
@title Interactive DAO contract for creating/modifying/endorsing proposals
@author Digix Holdings
*/
contract Dao is DaoCommon, Claimable {

    event NewProposal(bytes32 _proposalId, address _proposer);
    event ModifyProposal(bytes32 _proposalId, bytes32 _newDoc);
    event ChangeProposalFunding(bytes32 _proposalId);
    event FinalizeProposal(bytes32 _proposalId);
    event FinishMilestone(bytes32 _proposalId, uint256 _milestoneIndex);
    event AddProposalDoc(bytes32 _proposalId, bytes32 _newDoc);
    event PRLAction(bytes32 _proposalId, uint256 _actionId, bytes32 _doc);
    event StartSpecialProposal(bytes32 _specialProposalId);

    constructor(address _resolver) public {
        require(init(CONTRACT_DAO, _resolver));
    }

    function daoFundingManager()
        internal
        constant
        returns (DaoFundingManager _contract)
    {
        _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
    }

    function daoRewardsManager()
        internal
        constant
        returns (DaoRewardsManager _contract)
    {
        _contract = DaoRewardsManager(get_contract(CONTRACT_DAO_REWARDS_MANAGER));
    }

    function daoVotingClaims()
        internal
        constant
        returns (DaoVotingClaims _contract)
    {
        _contract = DaoVotingClaims(get_contract(CONTRACT_DAO_VOTING_CLAIMS));
    }

    /**
    @notice Set addresses for the new Dao and DaoFundingManager contracts
    @dev This is the first step of the 2-step migration
    @param _newDaoContract Address of the new Dao contract
    @param _newDaoFundingManager Address of the new DaoFundingManager contract
    @param _newDaoRewardsManager Address of the new daoRewardsManager contract
    */
    function setNewDaoContracts(
        address _newDaoContract,
        address _newDaoFundingManager,
        address _newDaoRewardsManager
    )
        public
        onlyOwner()
    {
        require(daoUpgradeStorage().isReplacedByNewDao() == false);
        daoUpgradeStorage().setNewContractAddresses(
            _newDaoContract,
            _newDaoFundingManager,
            _newDaoRewardsManager
        );
    }

    /**
    @notice Migrate this DAO to a new DAO contract
    @dev Migration can be done only during the locking phase, after the global rewards for current quarter are set.
         This is to make sure that there is no rewards calculation pending before the DAO is migrated to new contracts
    @param _newDaoContract Address of the new DAO contract
    @param _newDaoFundingManager Address of the new DaoFundingManager contract, which would receive the remaining ETHs in this DaoFundingManager
    @param _newDaoRewardsManager Address of the new daoRewardsManager contract, which would receive the claimableDGXs from this daoRewardsManager
    */
    function migrateToNewDao(
        address _newDaoContract,
        address _newDaoFundingManager,
        address _newDaoRewardsManager
    )
        public
        onlyOwner()
        ifGlobalRewardsSet(currentQuarterIndex())
    {
        require(isLockingPhase());
        require(daoUpgradeStorage().isReplacedByNewDao() == false);
        require(
          (daoUpgradeStorage().newDaoContract() == _newDaoContract) &&
          (daoUpgradeStorage().newDaoFundingManager() == _newDaoFundingManager) &&
          (daoUpgradeStorage().newDaoRewardsManager() == _newDaoRewardsManager)
        );
        daoUpgradeStorage().updateForDaoMigration();
        daoFundingManager().moveFundsToNewDao(_newDaoFundingManager);
        daoRewardsManager().moveDGXsToNewDao(_newDaoRewardsManager);
    }

    /**
    @notice Call this function to mark the start of the DAO's first quarter. This can only be done once, by a founder
    @param _start Start time of the first quarter in the DAO
    */
    function setStartOfFirstQuarter(uint256 _start) public if_founder() {
        require(daoUpgradeStorage().startOfFirstQuarter() == 0);
        daoUpgradeStorage().setStartOfFirstQuarter(_start);
    }

    /**
    @notice Submit a new preliminary idea / Pre-proposal
    @param _docIpfsHash Hash of the IPFS doc containing details of proposal
    @param _milestonesFundings Array of fundings of the proposal milestones (in wei)
    @param _finalReward Final reward asked by proposer at successful completion of all milestones of proposal
    */
    function submitPreproposal(
        bytes32 _docIpfsHash,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
        payable
        ifFundingPossible(_milestonesFundings, _finalReward)
    {
        senderCanDoProposerOperations();
        bool _isFounder = is_founder();

        require(msg.value == getUintConfig(CONFIG_PREPROPOSAL_DEPOSIT));
        require(address(daoFundingManager()).call.value(msg.value)());

        checkNonDigixFundings(_milestonesFundings, _finalReward);

        daoStorage().addProposal(_docIpfsHash, msg.sender, _milestonesFundings, _finalReward, _isFounder);
        daoStorage().setProposalCollateralStatus(_docIpfsHash, COLLATERAL_STATUS_UNLOCKED);

        emit NewProposal(_docIpfsHash, msg.sender);
    }

    /**
    @notice Modify a proposal (this can be done only before setting the final version)
    @param _proposalId Proposal ID (hash of IPFS doc of the first version of the proposal)
    @param _docIpfsHash Hash of IPFS doc of the modified version of the proposal
    @param _milestonesFundings Array of fundings of the modified version of the proposal (in wei)
    @param _finalReward Final reward on successful completion of all milestones of the modified version of proposal (in wei)
    */
    function modifyProposal(
        bytes32 _proposalId,
        bytes32 _docIpfsHash,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        require(isEditable(_proposalId));
        bytes32 _currentState;
        (,,,_currentState,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_currentState == PROPOSAL_STATE_PREPROPOSAL ||
          _currentState == PROPOSAL_STATE_DRAFT);

        checkNonDigixFundings(_milestonesFundings, _finalReward);

        daoStorage().editProposal(_proposalId, _docIpfsHash, _milestonesFundings, _finalReward);

        emit ModifyProposal(_proposalId, _docIpfsHash);
    }

    /**
    @notice Function to change the funding structure for a proposal
    @dev Proposers can only change fundings for the subsequent milestones,
    during the duration of an on-going milestone (so, cannot be during any voting phase)
    @param _proposalId ID of the proposal
    @param _milestonesFundings Array of fundings for milestones
    @param _finalReward Final reward needed for completion of proposal
    @param _currentMilestone the milestone number the proposal is currently in
    */
    function changeFundings(
        bytes32 _proposalId,
        uint256[] _milestonesFundings,
        uint256 _finalReward,
        uint256 _currentMilestone
    )
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        checkNonDigixFundings(_milestonesFundings, _finalReward);

        uint256[] memory _currentFundings;
        (_currentFundings,) = daoStorage().readProposalFunding(_proposalId);

        uint256 _startOfCurrentMilestone = startOfMilestone(_proposalId, _currentMilestone);

        // start of milestone must be more than 1st Jan 2000, otherwise the voting for this milestone hasn't even started yet
        require(_startOfCurrentMilestone > 946684800);

        // must be after the start of the milestone, and the milestone has not been finished yet (voting hasnt started)
        require(now > _startOfCurrentMilestone);
        require(daoStorage().readProposalVotingTime(_proposalId, _currentMilestone.add(1)) == 0);

        // can only modify the fundings after _currentMilestone
        //so, all the fundings from 0 to _currentMilestone must be the same
        for (uint256 i=0;i<=_currentMilestone;i++) {
            require(_milestonesFundings[i] == _currentFundings[i]);
        }

        daoStorage().changeFundings(_proposalId, _milestonesFundings, _finalReward);

        emit ChangeProposalFunding(_proposalId);
    }

    /**
    @notice Finalize a proposal
    @dev After finalizing a proposal, it cannot be modified further
    @param _proposalId ID of the proposal
    */
    function finalizeProposal(bytes32 _proposalId)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));
        require(isEditable(_proposalId));
        checkNonDigixProposalLimit(_proposalId);

        require(getTimeLeftInQuarter(now) > getUintConfig(CONFIG_DRAFT_VOTING_PHASE).add(getUintConfig(CONFIG_VOTE_CLAIMING_DEADLINE)));
        address _endorser;
        (,,_endorser,,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_endorser != EMPTY_ADDRESS);
        daoStorage().finalizeProposal(_proposalId);
        daoStorage().setProposalDraftVotingTime(_proposalId, now);

        emit FinalizeProposal(_proposalId);
    }

    /**
    @notice Function to set milestone to be completed
    @dev This can only be called in the Main Phase of DigixDAO by the proposer. It sets the
         voting time for the next milestone. If not enough time left in the current
         quarter, then the next voting is postponed to the start of next quarter
    @param _proposalId ID of the proposal
    @param _milestoneIndex Index of the milestone. Index starts from 0 (for the first milestone)
    */
    function finishMilestone(bytes32 _proposalId, uint256 _milestoneIndex)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        // must be after the start of this milestone, and the milestone has not been finished yet (voting hasnt started)
        uint256 _startOfCurrentMilestone = startOfMilestone(_proposalId, _milestoneIndex);
        require(_startOfCurrentMilestone > 946684800);
        require(now > _startOfCurrentMilestone);
        require(daoStorage().readProposalVotingTime(_proposalId, _milestoneIndex.add(1)) == 0);

        daoStorage().setProposalVotingTime(
            _proposalId,
            _milestoneIndex.add(1),
            getTimelineForNextVote(_milestoneIndex.add(1), now)
        ); // set the voting time of next voting

        emit FinishMilestone(_proposalId, _milestoneIndex);
    }

    /**
    @notice Add IPFS docs to a proposal
    @dev This is allowed only after a proposal is finalized. Before finalizing
         a proposal, proposer must modifyProposal. After the proposal is finalized,
         they can allProposalDoc to that proposal
    @param _proposalId ID of the proposal
    @param _newDoc hash of the new IPFS doc
    */
    function addProposalDoc(bytes32 _proposalId, bytes32 _newDoc)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));
        bytes32 _finalVersion;
        (,,,,,,,_finalVersion,,) = daoStorage().readProposal(_proposalId);
        require(_finalVersion != EMPTY_BYTES);
        daoStorage().addProposalDoc(_proposalId, _newDoc);

        emit AddProposalDoc(_proposalId, _newDoc);
    }

    /**
    @notice Function to endorse a pre-proposal (can be called only by DAO Moderator)
    @param _proposalId ID of the proposal (hash of IPFS doc of the first version of the proposal)
    */
    function endorseProposal(bytes32 _proposalId)
        public
        isProposalState(_proposalId, PROPOSAL_STATE_PREPROPOSAL)
    {
        require(isMainPhase());
        require(isModerator(msg.sender));
        daoStorage().updateProposalEndorse(_proposalId, msg.sender);
    }

    /**
    @notice Function to update the PRL (regulatory status) status of a proposal
    @param _proposalId ID of the proposal
    @param _doc hash of IPFS uploaded document, containing details of PRL Action
    */
    function updatePRL(
        bytes32 _proposalId,
        uint256 _action,
        bytes32 _doc
    )
        public
        if_prl()
    {
        require(_action == PRL_ACTION_STOP || _action == PRL_ACTION_PAUSE || _action == PRL_ACTION_UNPAUSE);
        daoStorage().updateProposalPRL(_proposalId, _action, _doc, now);

        emit PRLAction(_proposalId, _action, _doc);
    }

    /**
    @notice Function to create a Special Proposal (can only be created by the founders)
    @param _doc hash of the IPFS doc of the special proposal details
    @param _uintConfigs Array of the new UINT256 configs
    @param _addressConfigs Array of the new Address configs
    @param _bytesConfigs Array of the new Bytes32 configs
    @return {
      "_success": "true if created special successfully"
    }
    */
    function createSpecialProposal(
        bytes32 _doc,
        uint256[] _uintConfigs,
        address[] _addressConfigs,
        bytes32[] _bytesConfigs
    )
        public
        if_founder()
        returns (bool _success)
    {
        require(isMainPhase());
        address _proposer = msg.sender;
        daoSpecialStorage().addSpecialProposal(
            _doc,
            _proposer,
            _uintConfigs,
            _addressConfigs,
            _bytesConfigs
        );
        _success = true;
    }

    /**
    @notice Function to set start of voting round for special proposal
    @param _proposalId ID of the special proposal
    */
    function startSpecialProposalVoting(
        bytes32 _proposalId
    )
        public
    {
        require(isMainPhase());
        require(daoSpecialStorage().readProposalProposer(_proposalId) == msg.sender);
        require(daoSpecialStorage().readVotingTime(_proposalId) == 0);
        require(getTimeLeftInQuarter(now) > getUintConfig(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
        daoSpecialStorage().setVotingTime(_proposalId, now);

        emit StartSpecialProposal(_proposalId);
    }

    /**
    @notice Function to close proposal (also get back collateral)
    @dev Can only be closed if the proposal has not been finalized yet
    @param _proposalId ID of the proposal
    */
    function closeProposal(bytes32 _proposalId)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));
        bytes32 _finalVersion;
        bytes32 _status;
        (,,,_status,,,,_finalVersion,,) = daoStorage().readProposal(_proposalId);
        require(_finalVersion == EMPTY_BYTES);
        require(_status != PROPOSAL_STATE_CLOSED);
        require(daoStorage().readProposalCollateralStatus(_proposalId) == COLLATERAL_STATUS_UNLOCKED);

        daoStorage().closeProposal(_proposalId);
        daoStorage().setProposalCollateralStatus(_proposalId, COLLATERAL_STATUS_CLAIMED);
        require(daoFundingManager().refundCollateral(msg.sender));
    }

    /**
    @notice Function for founders to close all the dead proposals
    @dev all proposals who are not yet finalized, and been there for more than the threshold time
    @param _proposalIds Array of proposal IDs
    */
    function founderCloseProposals(bytes32[] _proposalIds)
        public
        if_founder()
    {
        uint256 _length = _proposalIds.length;
        uint256 _timeCreated;
        bytes32 _finalVersion;
        for (uint256 _i = 0; _i < _length; _i++) {
            (,,,,_timeCreated,,,_finalVersion,,) = daoStorage().readProposal(_proposalIds[_i]);
            require(_finalVersion == EMPTY_BYTES);
            require(now > _timeCreated.add(getUintConfig(CONFIG_PROPOSAL_DEAD_DURATION)));
            daoStorage().closeProposal(_proposalIds[_i]);
        }
    }
}
