from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Simple Demo")

@mcp.tool()
def say_hi(name: str) -> str:
    """Say Hi, [name] from Team Mammoth."""
    return "Hi " + name + " from Team Mammoth."

if __name__ == "__main__":
    mcp.run(transport="stdio")