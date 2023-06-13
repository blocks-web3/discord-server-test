import dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function (message: string) {
  if (!configuration.apiKey) {
    throw Error(
      "OpenAI API key not configured, please follow instructions in README.md"
    );
  }

  try {
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: message,
      temperature: 1,
    });
    return completion.data.choices;
  } catch (error: any) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      throw Error(error);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      throw Error(error);
    }
  }
}

function generatePrompt(animal: string) {
  const capitalizedAnimal =
    animal[0].toUpperCase() + animal.slice(1).toLowerCase();
  return `Suggest three names for an animal that is a superhero.

Animal: Cat
Names: Captain Sharpclaw, Agent Fluffball, The Incredible Feline
Animal: Dog
Names: Ruff the Protector, Wonder Canine, Sir Barks-a-Lot
Animal: ${capitalizedAnimal}
Names:`;
}
