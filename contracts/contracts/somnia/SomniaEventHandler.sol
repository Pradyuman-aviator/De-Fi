// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SomniaEventHandler
 * @notice Base contract for Somnia Reactivity on-chain handlers.
 *         Contracts that extend this can be invoked by Somnia validators
 *         when subscribed events are emitted on-chain.
 * @dev The Reactivity precompile at 0x0100 calls onEvent(), which then
 *      delegates to _onEvent() for custom handler logic.
 *      Reference: https://docs.somnia.network/developer/reactivity
 */
abstract contract SomniaEventHandler {
    /// @notice The Somnia Reactivity Precompile address.
    address public constant SOMNIA_REACTIVITY_PRECOMPILE = 0x0000000000000000000000000000000000000100;

    /// @notice Called by the Reactivity precompile when a subscribed event fires.
    /// @dev Only the precompile (0x0100) can call this function.
    /// @param emitter The contract that emitted the event.
    /// @param eventTopics The event topics (topic[0] = event signature hash).
    /// @param data The ABI-encoded non-indexed event data.
    function onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) external {
        require(msg.sender == SOMNIA_REACTIVITY_PRECOMPILE, "Only reactivity precompile");
        _onEvent(emitter, eventTopics, data);
    }

    /// @notice Override this function to implement custom handler logic.
    /// @dev WARNING: Avoid emitting events that match your own subscription filter —
    ///      this can cause infinite loops.
    /// @param emitter The contract that emitted the event.
    /// @param eventTopics The event topics.
    /// @param data The ABI-encoded non-indexed event data.
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal virtual;
}
