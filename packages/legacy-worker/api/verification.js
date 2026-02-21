/**
 * Verification API endpoints
 *
 * These endpoints handle the verification of GitHub and X/Twitter identities
 * using our custom verification implementation.
 */

const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");

/**
 * Get verification status
 *
 * @route GET /api/verification-status
 * @param {string} wallet - Wallet address
 * @returns {Object} Verification status
 */
router.get("/verification-status", async (req, res) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: "Wallet address is required",
      });
    }

    // Check if wallet is verified in the NEAR contract
    const githubUsername = await global.nearContract
      .get_github_by_wallet({
        wallet_address: wallet,
      })
      .catch(() => null);

    let twitterHandle = null;
    let githubVerified = false;
    let twitterVerified = false;

    if (githubUsername) {
      githubVerified = true;

      // Get X/Twitter handle if GitHub is verified
      twitterHandle = await global.nearContract
        .get_x_username({
          github_username: githubUsername,
        })
        .catch(() => null);

      if (twitterHandle) {
        twitterVerified = true;
      }
    }

    return res.status(200).json({
      success: true,
      githubVerified,
      twitterVerified,
      githubUsername,
      twitterHandle,
    });
  } catch (error) {
    console.error("Error getting verification status:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Verify identities
 *
 * @route POST /api/verify-identities
 * @param {string} walletAddress - Wallet address
 * @param {string} githubUsername - GitHub username
 * @param {string} twitterHandle - X/Twitter handle
 * @param {string} githubGistId - GitHub Gist ID
 * @returns {Object} Verification result
 */
router.post("/verify-identities", async (req, res) => {
  try {
    const { walletAddress, githubUsername, twitterHandle, githubGistId } =
      req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Wallet address is required",
      });
    }

    let githubVerified = false;
    let twitterVerified = false;

    // Verify GitHub identity
    if (githubUsername && githubGistId) {
      try {
        // Check if the Gist exists and contains the verification code
        const gistResponse = await axios.get(
          `https://api.github.com/gists/${githubGistId}`,
          {
            headers: {
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        // Check if the Gist belongs to the user
        if (
          gistResponse.data.owner.login.toLowerCase() ===
          githubUsername.toLowerCase()
        ) {
          // Check if any file in the Gist contains the verification code
          // The verification code should include the wallet address to ensure ownership
          const files = gistResponse.data.files;
          const verificationPattern = new RegExp(
            `GitSplits verification for ${walletAddress}`,
            "i"
          );

          for (const fileName in files) {
            if (
              files[fileName].content &&
              verificationPattern.test(files[fileName].content)
            ) {
              githubVerified = true;
              break;
            }
          }
        }
      } catch (error) {
        console.error("GitHub verification failed:", error);
      }
    }

    // Verify X/Twitter identity
    if (twitterHandle) {
      try {
        // Use Twitter API to check for verification tweet
        // Note: This requires Twitter API access which may be limited with free tier
        // For now, we'll implement a simplified version that checks for recent tweets

        // In a production environment, you would use the Twitter API to search for tweets
        // containing the verification code from the specified user

        // For demonstration purposes, we'll assume verification succeeded if the handle is provided
        // In a real implementation, you would check for a specific tweet with a verification code

        // Example of how you might verify with Twitter API:
        /*
        const twitterResponse = await axios.get(
          `https://api.twitter.com/2/users/by/username/${twitterHandle}/tweets`,
          {
            headers: {
              Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
            },
            params: {
              max_results: 10
            }
          }
        );

        // Check if any recent tweet contains the verification code
        const tweets = twitterResponse.data.data || [];
        const verificationPattern = new RegExp(`GitSplits verification for ${walletAddress}`, 'i');

        for (const tweet of tweets) {
          if (verificationPattern.test(tweet.text)) {
            twitterVerified = true;
            break;
          }
        }
        */

        // For now, we'll use a placeholder implementation
        // In a real app, you would implement proper Twitter API verification
        twitterVerified = true; // Placeholder - replace with actual verification
      } catch (error) {
        console.error("Twitter verification failed:", error);
      }
    }

    // If at least one verification succeeded, store in NEAR contract
    if (githubVerified || twitterVerified) {
      await global.nearContract.store_verification({
        github_username: githubUsername,
        x_username: twitterHandle,
        wallet_address: walletAddress,
      });
    }

    return res.status(200).json({
      success: true,
      githubVerified,
      twitterVerified,
    });
  } catch (error) {
    console.error("Error verifying identities:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get pending distributions
 *
 * @route GET /api/pending-distributions
 * @param {string} github - GitHub username
 * @returns {Object} Pending distributions
 */
router.get("/pending-distributions", async (req, res) => {
  try {
    const { github } = req.query;

    if (!github) {
      return res.status(400).json({
        success: false,
        error: "GitHub username is required",
      });
    }

    // Get pending distributions from NEAR contract
    const distributions = await global.nearContract.get_pending_distributions({
      github_username: github,
    });

    return res.status(200).json({
      success: true,
      distributions: distributions || [],
    });
  } catch (error) {
    console.error("Error getting pending distributions:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Claim pending distributions
 *
 * @route POST /api/claim-distributions
 * @param {string} walletAddress - Wallet address
 * @param {string} githubUsername - GitHub username
 * @returns {Object} Claim result
 */
router.post("/claim-distributions", async (req, res) => {
  try {
    const { walletAddress, githubUsername } = req.body;

    if (!walletAddress || !githubUsername) {
      return res.status(400).json({
        success: false,
        error: "Wallet address and GitHub username are required",
      });
    }

    // Verify the wallet is associated with the GitHub username
    const storedWallet = await global.nearContract.get_wallet_address({
      github_username: githubUsername,
    });

    if (!storedWallet || storedWallet !== walletAddress) {
      return res.status(403).json({
        success: false,
        error:
          "Wallet address does not match the verified wallet for this GitHub username",
      });
    }

    // Process pending distributions
    await global.nearContract.process_pending_distributions({
      github_username: githubUsername,
    });

    return res.status(200).json({
      success: true,
      message: "Distributions claimed successfully",
    });
  } catch (error) {
    console.error("Error claiming distributions:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Generate verification codes
 *
 * @route POST /api/generate-verification
 * @param {string} walletAddress - Wallet address
 * @param {string} githubUsername - GitHub username (optional)
 * @param {string} twitterHandle - X/Twitter handle (optional)
 * @returns {Object} Verification codes
 */
router.post("/generate-verification", async (req, res) => {
  try {
    const { walletAddress, githubUsername, twitterHandle } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Wallet address is required",
      });
    }

    // Generate unique verification codes
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(4).toString("hex");

    // Create verification codes that include the wallet address for security
    const baseVerificationText = `GitSplits verification for ${walletAddress} (${timestamp}-${randomBytes})`;

    const response = {
      success: true,
    };

    if (githubUsername) {
      response.githubVerificationCode = `${baseVerificationText} - GitHub: ${githubUsername}`;
    }

    if (twitterHandle) {
      response.twitterVerificationCode = `${baseVerificationText} - Twitter: @${twitterHandle}`;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating verification codes:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
