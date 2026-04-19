import { describe, it, expect } from "vitest";
import { isPrivateIP } from "./is-private-ip";

describe("isPrivateIP", () => {
  it("rejects 10.x.x.x private range", () => {
    expect(isPrivateIP("10.0.0.1")).toBe(true);
    expect(isPrivateIP("10.255.255.255")).toBe(true);
  });

  it("rejects 172.16-31.x.x private range", () => {
    expect(isPrivateIP("172.16.0.1")).toBe(true);
    expect(isPrivateIP("172.31.255.255")).toBe(true);
  });

  it("rejects 192.168.x.x private range", () => {
    expect(isPrivateIP("192.168.0.1")).toBe(true);
    expect(isPrivateIP("192.168.1.100")).toBe(true);
  });

  it("rejects 127.x.x.x loopback range", () => {
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("127.255.255.255")).toBe(true);
  });

  it("rejects 169.254.x.x link-local", () => {
    expect(isPrivateIP("169.254.1.1")).toBe(true);
  });

  it("rejects 0.0.0.0", () => {
    expect(isPrivateIP("0.0.0.0")).toBe(true);
  });

  it("rejects IPv6 loopback ::1", () => {
    expect(isPrivateIP("::1")).toBe(true);
  });

  it("rejects IPv6 link-local fe80::", () => {
    expect(isPrivateIP("fe80::1")).toBe(true);
  });

  it("rejects IPv6 unique local fc/fd", () => {
    expect(isPrivateIP("fc00::1")).toBe(true);
    expect(isPrivateIP("fd12::1")).toBe(true);
  });

  it("allows public IPs", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("1.1.1.1")).toBe(false);
    expect(isPrivateIP("203.0.113.1")).toBe(false);
  });

  it("allows public hostnames", () => {
    expect(isPrivateIP("google.com")).toBe(false);
    expect(isPrivateIP("performancepeak.co.uk")).toBe(false);
  });

  it("rejects 172.15.x.x is in NOT private range", () => {
    expect(isPrivateIP("172.15.0.1")).toBe(false);
  });

  it("rejects 172.32.x.x is NOT in private range", () => {
    expect(isPrivateIP("172.32.0.1")).toBe(false);
  });
});
