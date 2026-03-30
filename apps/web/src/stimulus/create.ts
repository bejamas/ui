import { Application } from "@hotwired/stimulus";
import CreateEditorController from "@/stimulus/controllers/create_editor_controller";
import CreateNavigateController from "@/stimulus/controllers/create_navigate_controller";
import CreatePickerController from "@/stimulus/controllers/create_picker_controller";
import CreatePreviewController from "@/stimulus/controllers/create_preview_controller";
import CreateProjectDialogController from "@/stimulus/controllers/create_project_dialog_controller";
import CreateSidebarController from "@/stimulus/controllers/create_sidebar_controller";

const application = Application.start();

application.register("create-editor", CreateEditorController);
application.register("create-picker", CreatePickerController);
application.register("create-sidebar", CreateSidebarController);
application.register("create-project-dialog", CreateProjectDialogController);
application.register("create-navigate", CreateNavigateController);
application.register("create-preview", CreatePreviewController);

export { application };
