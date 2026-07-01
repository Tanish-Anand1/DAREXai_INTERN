import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SecurityBadge } from "@/components/security-badge";

describe("SecurityBadge", () => {
  it("renders the security label", () => {
    render(<SecurityBadge label="Tenant isolation active" />);
    expect(screen.getByText("Tenant isolation active")).toBeInTheDocument();
  });
});
