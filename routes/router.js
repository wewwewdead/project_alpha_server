import express from 'express'
import multer from 'multer'
import { GoogleGenAI } from "@google/genai";
import { codeBlock } from 'common-tags';
import 'dotenv/config';

// initialize google ai with api Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: 10 * 1024 * 1024},
}).single('image');

router.post('/convert', upload, async(req,res) =>{
    if(!req.file){
        return res.status(400).json({message: 'No image file uploaded'})
    }try {
    const base64Image = req.file.buffer.toString("base64");
    // console.log('SERVER-SIDE: Base64 image length:', base64Image.length)
    const convertImageFunction = {
        name: 'convert_image', //this is the name of the function
        description: 
        `Converts the image into proper csv format`,
        parameters: {
            type: 'object',
            properties: {
                csvData: {
                    type: 'string',
                    description: `The csv format data,
                    example:
                    Name, Age, Postion
                    JohnDoe,25,Manger`
                }
            },
            required: ['csvData']
        }
    }

    const config = {
        tools: [{
            functionDeclarations: [convertImageFunction]
        }]
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [
            {
                role: 'user',
                parts:[
                    {text: codeBlock`
                        You are an expert document and table extraction assistant, highly skilled in accurately extracting structured data from diverse table formats, including crisp printed tables, challenging handwritten tables, and mixed media (e.g., scanned documents, PDFs, or images with overlaid text). Your primary task is to analyze the provided image, identify any table structure within it, and extract all the data contained in that structure, outputting it as a clean CSV string.
Follow these strict guidelines during the extraction process:

Capture All Rows: Extract every row that constitutes part of the table structure in the image, including header rows, data rows, footer rows, summary rows, or total rows. Ensure no row is omitted, even if partially visible or fragmented.

Identify Headers: Automatically detect and infer the appropriate column headers based on the table's layout, content context, or implied structure (e.g., bolded text, underlined rows, or topmost data row). Use these headers as the very first row in the final CSV output. If headers are ambiguous or missing, generate logical placeholders (e.g., "Column1", "Column2") based on the number of columns detected.

Maintain Alignment: Ensure all extracted data maintains correct and precise row and column alignment, preserving the original structure of the table. Align data with the corresponding headers based on spatial positioning in the image.

Handle Missing/Unreadable Data: If any cell in the table is unreadable, blank in the original image, or its content cannot be confidently determined (especially common in handwritten sections, low-resolution scans, or faded text), leave that specific cell completely empty in the CSV output (represented as ""). Flag such instances internally and avoid speculative guesses.

Strict CSV Format: The output must contain only the raw CSV data as a plain text string. Do not include markdown formatting (e.g., code blocks), introductory or explanatory text, metadata, error messages, or any extraneous characters before or after the CSV content. Use commas (,) as delimiters and double quotes (") to enclose each cell value, ensuring compatibility with standard CSV parsers.

Error Handling and Validation:
If no table structure is detected in the image, output a single-row CSV with a header row of "Error,No table detected" and an empty data row: "","".

If the image is corrupted, unreadable, or unsupported (e.g., non-image file types), output a single-row CSV with a header row of "Error,Processing failed" and an empty data row: "","".

Validate the extracted data for consistency (e.g., matching column counts across rows) and adjust by padding with empty cells ("") if misalignment is detected.

Metadata Consideration (Optional): If the image contains metadata (e.g., captions, footnotes, or labels outside the table), ignore it unless it is part of the table structure itself (e.g., a header or footer row). Do not include it in the CSV output.

Edge Cases:
Handle merged cells by replicating the value in all affected cells in the CSV output to maintain a rectangular grid.

For handwritten tables, prioritize legible patterns and context clues (e.g., handwriting alignment, spacing) to infer structure, but leave cells empty if content is indecipherable.

Support multi-line cells by concatenating content into a single cell value, enclosed in double quotes.

Example of Desired CSV Format:

Name,Age,Position
"John",35,"Manager"
"Jane",29,"Engineer"
"Total","",""
`},
                    {
                        inlineData: {
                            mimeType: req.file.mimetype,
                            data: base64Image,
                        }
                    }
                ]
            }
        ],
        config: config
    });

    if(response.functionCalls && response.functionCalls.length > 0) {
        const functiocall = response.functionCalls[0];

        return res.status(200).json(
            {csvData: functiocall.args.csvData,
        });
    } else {
        return res.status(500).json({error: 'Error in converting the image into csv'})
    }

    } catch (error) {
        console.error("Error converting image:", 
            {
                message: error.message,
                stack: error.stack,
                details: error.response ? error.response.data : null
            }
        );
        res.status(500).json({ error: "Failed to convert image" });
    }
})

export default router;