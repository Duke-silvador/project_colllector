#!/usr/bin/env python3
"""
HTTP Security Analyzer CLI Tool
Analyzes HTTP/HTTPS responses for security headers, cookies, TLS configuration, redirects, and HTTP methods.
"""

import sys
import argparse
from urllib.parse import urlparse
import requests

from analyzer.headers_analyzer import analyze_headers
from analyzer.cookie_analyzer import analyze_cookies
from analyzer.redirect_analyzer import analyze_redirects
from analyzer.tls_analyzer import analyze_tls
from analyzer.methods_analyzer import analyze_methods
from analyzer.scorer import calculate_score
from analyzer.formatter import format_cli_report, format_json_report

def normalize_url(raw_url: str) -> str:
    """Ensure URL has scheme (defaults to https://)."""
    raw_url = raw_url.strip()
    if not raw_url.startswith(("http://", "https://")):
        return f"https://{raw_url}"
    return raw_url

def extract_set_cookie_headers(response: requests.Response) -> list:
    """Extract raw Set-Cookie header strings from a requests.Response object."""
    # 1. Try urllib3 HTTPHeaderDict on response.raw.headers
    if hasattr(response, 'raw') and response.raw and hasattr(response.raw, 'headers') and response.raw.headers:
        if hasattr(response.raw.headers, 'getlist'):
            cookies = response.raw.headers.getlist('Set-Cookie') or response.raw.headers.getlist('set-cookie')
            if cookies:
                return cookies
        elif hasattr(response.raw.headers, 'get_all'):
            cookies = response.raw.headers.get_all('Set-Cookie', []) or response.raw.headers.get_all('set-cookie', [])
            if cookies:
                return cookies

    # 2. Try _original_response.headers (http.client.HTTPMessage)
    if hasattr(response, 'raw') and response.raw and hasattr(response.raw, '_original_response') and response.raw._original_response:
        orig = response.raw._original_response
        orig_headers = getattr(orig, 'headers', None) or getattr(orig, 'msg', None)
        if orig_headers:
            if hasattr(orig_headers, 'get_all'):
                cookies = orig_headers.get_all('Set-Cookie', []) or orig_headers.get_all('set-cookie', [])
                if cookies:
                    return cookies
            elif hasattr(orig_headers, 'getlist'):
                cookies = orig_headers.getlist('Set-Cookie') or orig_headers.getlist('set-cookie')
                if cookies:
                    return cookies

    # 3. Fallback to response.headers
    if "Set-Cookie" in response.headers:
        return [response.headers["Set-Cookie"]]

    return []

def analyze_target(
    url: str,
    timeout: int = 10,
    follow_redirects: bool = True,
    user_agent: str = None,
    headers_only: bool = False,
    verbose: bool = False
) -> dict:
    """Performs full or headers-only HTTP security analysis on target URL."""
    target_url = normalize_url(url)

    headers = {"User-Agent": user_agent or "HTTPSecurityAnalyzer/1.0"}

    # 1. Primary Request & Redirect Handling
    try:
        response = requests.get(
            target_url,
            headers=headers,
            timeout=timeout,
            allow_redirects=follow_redirects,
            verify=False  # Allow analyzing hosts with self-signed certs without crashing
        )
    except requests.RequestException as err:
        print(f"[!] Error connecting to target {target_url}: {err}", file=sys.stderr)
        sys.exit(1)

    history = response.history
    final_resp = response
    final_url = final_resp.url

    # 2. Extract Response Info
    server_header = final_resp.headers.get("Server", "Not disclosed")
    status_code = final_resp.status_code

    response_info = {
        "status_code": status_code,
        "http_version": f"HTTP/{final_resp.raw.version / 10:.1f}" if hasattr(final_resp, 'raw') and hasattr(final_resp.raw, 'version') and final_resp.raw.version else "HTTP/1.1",
        "server": server_header,
        "content_type": final_resp.headers.get("Content-Type", "N/A")
    }

    # 3. Analyze Security Headers
    headers_res = analyze_headers(dict(final_resp.headers))

    all_findings = []
    all_findings.extend(headers_res.get("findings", []))

    if headers_only:
        cookies_res = {"findings": [], "cookies": []}
        redirect_res = {"chain": [], "total_redirects": 0, "findings": []}
        tls_res = {"https_enabled": False, "findings": []}
        methods_res = {"supported_methods": [], "findings": []}
    else:
        # 4. Analyze Cookies
        raw_cookie_headers = extract_set_cookie_headers(final_resp)
        target_is_https = urlparse(final_url).scheme.lower() == "https"
        cookies_res = analyze_cookies(raw_cookie_headers, target_is_https=target_is_https)

        # 5. Analyze Redirects
        redirect_res = analyze_redirects(history, final_resp)

        # 6. Analyze TLS / SSL
        tls_res = analyze_tls(final_url, timeout=timeout)

        # 7. Analyze HTTP Methods (OPTIONS)
        methods_res = analyze_methods(final_url, timeout=timeout, headers=headers)

        all_findings.extend(cookies_res.get("findings", []))
        all_findings.extend(redirect_res.get("findings", []))
        all_findings.extend(tls_res.get("findings", []))
        all_findings.extend(methods_res.get("findings", []))

    # 8. Calculate Score
    score_res = calculate_score(all_findings)

    return {
        "target_url": target_url,
        "final_url": final_url,
        "headers_only": headers_only,
        "verbose": verbose,
        "response_info": response_info,
        "headers_analysis": headers_res,
        "cookie_analysis": cookies_res,
        "redirect_analysis": redirect_res,
        "tls_analysis": tls_res,
        "methods_analysis": methods_res,
        "all_findings": all_findings,
        "score_summary": score_res
    }

def main():
    parser = argparse.ArgumentParser(
        description="HTTP Security Analyzer - Audits security headers, cookies, TLS configuration, redirects, and HTTP methods.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python http_security_analyzer.py https://example.com
  python http_security_analyzer.py https://example.com --verbose
  python http_security_analyzer.py https://example.com --timeout 15
  python http_security_analyzer.py https://example.com --json -o report.json
  python http_security_analyzer.py https://example.com --headers-only
  python http_security_analyzer.py https://example.com --no-color
        """
    )
    parser.add_argument("url", help="Target URL to analyze (e.g. https://example.com or example.com)")
    parser.add_argument("-v", "--verbose", action="store_true", help="Show detailed technical and diagnostic analysis output")
    parser.add_argument("-t", "--timeout", type=int, default=10, help="HTTP request and TLS socket timeout in seconds (default: 10)")
    parser.add_argument("--json", action="store_true", help="Output full report in structured JSON format")
    parser.add_argument("-o", "--output", help="Save report output to specified file (supports JSON or text)")
    parser.add_argument("--headers-only", action="store_true", help="Run audit only on HTTP security headers (skips TLS, cookies, redirects, methods)")
    parser.add_argument("--no-color", action="store_true", help="Disable ANSI color codes in console output")
    parser.add_argument("--no-redirects", action="store_true", help="Do not follow HTTP redirects")
    parser.add_argument("--user-agent", help="Custom User-Agent header string")

    args = parser.parse_args()

    # Disable urllib3 insecure request warnings for self-signed cert targets
    requests.packages.urllib3.disable_warnings()

    report_data = analyze_target(
        url=args.url,
        timeout=args.timeout,
        follow_redirects=not args.no_redirects,
        user_agent=args.user_agent,
        headers_only=args.headers_only,
        verbose=args.verbose
    )

    if args.json:
        output_str = format_json_report(report_data)
    else:
        output_str = format_cli_report(
            report_data,
            use_colors=not args.no_color,
            verbose=args.verbose,
            headers_only=args.headers_only
        )

    print(output_str)

    if args.output:
        try:
            with open(args.output, "w", encoding="utf-8") as f:
                if args.json:
                    f.write(output_str)
                elif not args.no_color:
                    clean_str = format_cli_report(
                        report_data,
                        use_colors=False,
                        verbose=args.verbose,
                        headers_only=args.headers_only
                    )
                    f.write(clean_str)
                else:
                    f.write(output_str)
            print(f"\n[+] Report successfully saved to: {args.output}")
        except IOError as err:
            print(f"[!] Failed to save report to file {args.output}: {err}", file=sys.stderr)

if __name__ == "__main__":
    main()
