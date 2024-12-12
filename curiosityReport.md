### Self-Healing
Observability and monitoring tools are essential to DevOps as they allow for the detection of errors and attacks. However, these tools cannot work alone; they still require human involement to acknowledge the issue, decide on a course of action, and resolve it. Of course, if the issue is significantly complex, having a human oversee the resolution of the issue is wise. But there are many benefits to automating and creating self-healing processes for issues that are relatively straightforward and predictable. 

Self-healing infrastructure allows for a faster fix as there is no need to wait for a human to acknowledge and resolve the issue. The cost of downtime across all industries ranges from around [$5600 to $9000 per minute](https://www.pingdom.com/outages/average-cost-of-downtime-per-industry/), so a lot of money can be saved by employing self-healing strategies. In addition, automating the process of fixing the simple and mundane issues can free up the engineers' time to work on more significant things.

Self-healing code requires automated processes to detect, analyze/pinpoint the source, and run the proper fix for the problem. The automation of this whole process is improving quickly with the increasing power of AI.

### LLMPatch
I read [this research paper](https://arxiv.org/pdf/2408.13597) on an automated patching program called LLMPatch. It sends the source code, vulnerable statement, and the vulnerability type as input to an LLM (they tested GPT-4, Gemini, Llama3, and Claude3) which then generates possible patches.

![image](https://github.com/user-attachments/assets/1ebeb166-94d1-4915-ba2e-03a27e4f4716)

Here is how it works:
- Step 1: Extract the vulnerability semantics and contextual code. 
	- LLMPatch first uses [Joern](https://docs.joern.io/export/) to process the source code, then generates a program dependence graph (PDG) which is a graph of all of the data dependencies and control dependencies. 
	- Given the vulnerable statement of code as the input, LLMPatch can use the PDG to find all lines of code that depend on that vulnerable statement (and are relevant to the issue).
- Step 2: Prompt the LLM to generate root causes of the issue
	- Now that LLMPatch has the input and all of the relevant pieces of code, it can generate a root cause.
	- This is the prompt they use:
       - *"Given the following code slice {VULNERABLE_CODE} which has a {VULNERABILITY_TYPE} vulnerability at line {LINE}, please analyze the root cause of the vulnerability. If you encounter uncertainty due to a lack of function definitions, please say “Please provide the summary of the function {FUNCTION_NAME}."*
	- The LLM can then generate a root cause or, if it is still uncertain, it can ask for more information about a function. 
- Step 3: Select an exemplar
	- An exemplar is a sample issue that includes the vulnerability type, the vulnerable line of code (and other relevant lines of code), the root cause analysis, the fixing strategy, and groundtruth patch.
	- The LLM is prompted to select from a set of predefined exemplars the one that best matches the root cause that they generated in the previous step. 
		- *"Does the following two vulnerabilities share similar root causes: {EXEMPLAR_VULNERABILITY} and {CURRENT_VULNERABILITY}. Please simply answer yes or no."*
- Step 4: Generate patches
	- The LLM is prompted to generate several different patches.
		- *"With the following template: {EXEMPLAR}, given the following code slice: {VULNERABLE_CODE} which has a vulnerability at line: {LINE}, please generate five possible patches for the vulnerability."*
- Step 5: Patch validation
	- Finally, they use an ensemble of multiple LLMs to validate the generated patches.
		- *"Given the following code slice {CODE_SLICE} which has a vulnerability at line {LINE}. Please validate whether the following patch fixes the vulnerability while keeping the functionality {GENERATED_PATCH}. Please simply answer yes or no."*

I thought this was pretty cool! The program only requires the source code, vulnerable statement, and the vulnerability type as input, and all of that could potentially be gathered from existing observability tools. However, there is still a ways to go; only about 50% of the generated patches were correct. Despite that, I think this has real potential and am excited to see how AI changes DevOps in the future!

![image](https://github.com/user-attachments/assets/d9f80b6a-798c-4e83-a39d-a98f16c5b9a9)

