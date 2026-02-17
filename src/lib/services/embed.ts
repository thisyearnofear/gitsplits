export function generateEmbedCode(
  repoInfo: { owner: string; name: string },
  displayStyle: "minimal" | "expanded"
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `<iframe 
      src="${baseUrl}/embed?repo=${repoInfo.owner}/${
    repoInfo.name
  }&style=${displayStyle}"
      width="100%"
      height="${displayStyle === "minimal" ? "100" : "300"}"
      frameborder="0"
    ></iframe>`;
}
