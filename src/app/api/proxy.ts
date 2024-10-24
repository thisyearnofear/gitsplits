import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Store your PAT in environment variables

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  if (method === "GET") {
    try {
      const response = await axios.get(
        `https://api.github.com${req.query.path}`,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
          },
        }
      );
      res.status(200).json(response.data);
    } catch (error) {
      res
        .status(error.response?.status || 500)
        .json({ message: error.message });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
};

export default handler;
