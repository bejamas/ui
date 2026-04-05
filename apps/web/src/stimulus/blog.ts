import { Application } from "@hotwired/stimulus";

import BlogStateBridgeController from "@/stimulus/controllers/blog_state_bridge_controller";

const application = Application.start();

application.register("blog-state-bridge", BlogStateBridgeController);

export { application };
