"""Allowlisted FalkorDB inspection tools for PACT's local agent and MCP hosts."""

from mcp.server import MCPServer

from pact import candidates, graph, memories, scenario
from planner import plan


def create_server(graph_factory=graph):
    server = MCPServer("PACT graph tools")

    @server.tool()
    def inspect_connections() -> dict:
        """Read the current goal, requirements, active offers and organizations."""
        return candidates(graph_factory())

    @server.tool()
    def check_schedule() -> dict:
        """Check all bounded partner combinations against current graph facts."""
        return plan(scenario(graph_factory()))

    @server.tool()
    def recall_failure() -> list[dict]:
        """Read historical provider failure and compare it with current capacity."""
        return memories(graph_factory())

    return server


mcp = create_server()


if __name__ == "__main__":
    mcp.run()
