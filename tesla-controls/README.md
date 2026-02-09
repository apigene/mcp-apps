# Tesla Controls MCP App Template

An interactive Tesla vehicle control interface inspired by the Tesla mobile app. This template provides a visual car control interface with tappable icons for various vehicle functions.

## Features

- **Interactive Car Visualization**: Top-down view of a Tesla vehicle with interactive control points
- **Vehicle Controls**:
  - Front Trunk (Frunk) - Open/Close
  - Lock/Unlock - Vehicle security
  - Rear Trunk - Open/Close
  - Charging Port - Open/Close with charging status indicator
- **Quick Actions Bar**: Bottom control bar with:
  - Flash - Flash headlights
  - Honk - Sound horn
  - Start - Remote start vehicle
  - Vent - Vent windows
- **Visual Feedback**: Success/error animations when actions are triggered
- **Dark Theme**: Tesla-inspired dark color scheme
- **Responsive Design**: Works on mobile and desktop

## Expected Data Format

The app can work with or without initial data. If data is provided, it should follow this structure:

```json
{
  "locked": true,
  "frunkOpen": false,
  "trunkOpen": false,
  "charging": false,
  "chargingPortOpen": false
}
```

## Usage

### Basic Usage

The app will render with default state if no data is provided. Users can interact with controls by tapping/clicking on the various icons.

### Server-Side Action Handling

When a user taps a control, the app sends a request to the host via `ui/request-data`:

```typescript
{
  type: 'tesla-control-action',
  action: 'lock' | 'unlock' | 'open-frunk' | 'close-frunk' | 'open-trunk' | 
          'close-trunk' | 'open-charge-port' | 'close-charge-port' | 
          'start-charging' | 'stop-charging' | 'flash' | 'honk' | 'start' | 'vent',
  params: {}
}
```

### Server-Side Implementation Example

```python
async def handle_ui_request_data(request: dict) -> dict:
    request_type = request.get('type')
    
    if request_type == 'tesla-control-action':
        action = request.get('action')
        params = request.get('params', {})
        
        # Execute the Tesla API call based on action
        result = await execute_tesla_action(action, params)
        
        # Return updated state
        return {
            'success': True,
            'locked': result.get('locked'),
            'frunkOpen': result.get('frunk_open'),
            'trunkOpen': result.get('trunk_open'),
            'charging': result.get('charging'),
            'chargingPortOpen': result.get('charge_port_open')
        }
    
    return {'error': 'Unknown request type'}
```

## Styling

The app uses a dark theme with:
- Background: `#1a1a1a` (light mode) / `#0f0f0f` (dark mode)
- Car visualization with gradient background
- Interactive buttons with hover and active states
- Visual feedback animations for actions

## Customization

### Adding New Controls

1. Add a new button in `renderTeslaControls()` function
2. Add the corresponding action handler in `sendControlAction()`
3. Update state management in `updateStateFromAction()`
4. Add styling in `mcp-app.css`

### Modifying Car Appearance

Edit the `.tesla-car` styles in `mcp-app.css` to change:
- Car size and proportions
- Colors and gradients
- Control button positions
- Visual effects

## Browser Support

- Modern browsers with ES6+ support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design for various screen sizes

## Notes

- All controls are interactive and send requests to the host
- State is managed locally and updated based on action results
- Visual feedback is provided for all actions (success/error)
- The app automatically adapts to dark/light mode preferences
