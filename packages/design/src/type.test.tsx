import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Body, H1, H4, Typography } from "./type";

describe("type components", () => {
  it("renders one header one and bolds body with b", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Typography>
        <H1>Your realms.</H1>
        <H4>Morning walk</H4>
        <Body b>One real move.</Body>
      </Typography>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Your realms." }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 4, name: "Morning walk" }),
    ).toBeVisible();
    expect(screen.getByText("One real move.")).toHaveAttribute(
      "data-b",
      "true",
    );
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("warns when a second header one mounts", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Typography>
        <H1>First</H1>
        <H1>Second</H1>
      </Typography>,
    );
    expect(error).toHaveBeenCalledWith(
      "Header one is the page subject. Mount one header one, or none.",
    );
    error.mockRestore();
  });

  it("ignores a header one inside an inert region", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Typography>
        <div inert>
          <H1>Hidden page</H1>
        </div>
        <H1>Eyes on the road.</H1>
      </Typography>,
    );
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
