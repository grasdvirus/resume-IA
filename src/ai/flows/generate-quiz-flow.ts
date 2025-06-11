
'use server';
/**
 * @fileOverview Génère un quiz QCM à partir d'un texte de résumé.
 *
 * - generateQuiz - Fonction qui gère la génération du quiz.
 * - GenerateQuizInput - Type d'entrée pour la fonction generateQuiz.
 * - QuizQuestion - Structure d'une question de quiz.
 * - QuizData - Structure des données complètes du quiz retournées.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  summaryText: z.string().describe('Le texte du résumé à partir duquel générer le quiz.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const QuizOptionSchema = z.object({
  id: z.string().describe("Un identifiant unique pour l'option (par exemple, 'a', 'b', 'c')."),
  text: z.string().describe("Le texte de l'option de réponse."),
});

const QuizQuestionSchema = z.object({
  id: z.string().describe("Un identifiant unique pour la question (par exemple, 'q1', 'q2')."),
  questionText: z.string().describe('Le texte de la question du quiz.'),
  options: z.array(QuizOptionSchema).min(3).max(4).describe('Un tableau de 3 ou 4 options de réponse.'),
  correctAnswerId: z.string().describe("L'identifiant de l'option de réponse correcte."),
  explanation: z.string().optional().describe("Une brève explication de pourquoi la réponse est correcte (optionnel).")
});

const QuizDataSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(3).max(5).describe('Un tableau de 3 à 5 questions de quiz.'),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizData = z.infer<typeof QuizDataSchema>;


export async function generateQuiz(input: GenerateQuizInput): Promise<QuizData> {
  return generateQuizFlow(input);
}

const quizSystemPrompt = `
Vous êtes un assistant IA expert dans la création de contenu pédagogique. Votre tâche est de générer un quiz à choix multiples (QCM) basé sur le texte de résumé fourni.
Le quiz doit contenir entre 3 et 5 questions pertinentes qui testent la compréhension du résumé.
Chaque question doit avoir 3 ou 4 options de réponse. Une seule option doit être correcte.
Variez le style des questions : certaines peuvent porter sur des faits directs, d'autres sur des déductions ou des concepts clés.
Fournissez une brève explication pour chaque bonne réponse si cela semble pertinent.

Format de sortie attendu :
Vous devez impérativement retourner un objet JSON valide qui correspond au schéma Zod fourni.
Assurez-vous que les `id` des questions (ex: "q1", "q2") et des options (ex: "q1a", "q1b", "q1c") sont uniques au sein de leur contexte. L'ID de l'option correcte doit correspondre à l'un des ID des options proposées pour cette question.
Par exemple pour une question "q1", les options pourraient être "q1a", "q1b", "q1c", et correctAnswerId serait l'un de ceux-là.
`;

const generateQuizPrompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  system: quizSystemPrompt,
  input: {schema: GenerateQuizInputSchema},
  output: {schema: QuizDataSchema},
  prompt: `Voici le résumé sur lequel baser le quiz :

{{{summaryText}}}

Générez le quiz QCM en respectant scrupuleusement le format JSON et les contraintes spécifiées dans les instructions système.`,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: QuizDataSchema,
  },
  async (input) => {
    const {output} = await generateQuizPrompt(input);
    if (!output) {
      throw new Error("La génération du quiz n'a pas produit de sortie.");
    }
    
    if (!output.questions || output.questions.length === 0) {
        console.error("Aucune question générée ou format incorrect:", output);
        // Fallback conforme au schéma (au moins 3 options par question, et au moins 3 questions)
        return { 
            questions: [
                {
                    id: "fallback_q1",
                    questionText: "Le résumé fourni semble trop court ou complexe pour générer un quiz automatiquement (question 1). Veuillez essayer avec un autre résumé.",
                    options: [
                        {id: "f_q1_a", text: "Option A (Fallback)"},
                        {id: "f_q1_b", text: "Option B (Fallback)"},
                        {id: "f_q1_c", text: "Option C (Fallback - Correcte)"}
                    ],
                    correctAnswerId: "f_q1_c",
                    explanation: "Ceci est un message de fallback."
                },
                {
                    id: "fallback_q2",
                    questionText: "Question de fallback 2 pour assurer la conformité du schéma.",
                    options: [
                        {id: "f_q2_a", text: "Option A"},
                        {id: "f_q2_b", text: "Option B (Correcte)"},
                        {id: "f_q2_c", text: "Option C"}
                    ],
                    correctAnswerId: "f_q2_b",
                },
                {
                    id: "fallback_q3",
                    questionText: "Question de fallback 3.",
                    options: [
                        {id: "f_q3_a", text: "Option X (Correcte)"},
                        {id: "f_q3_b", text: "Option Y"},
                        {id: "f_q3_c", text: "Option Z"}
                    ],
                    correctAnswerId: "f_q3_a",
                }
            ]
        };
    }
    return output;
  }
);
